import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  BuscarLicitacoesFiltro,
  CriarLicitacaoManualInput,
  ImportarItensPlanilhaResponse,
  ItemResponse,
  LicitacaoComItensResponse,
  LicitacaoResponse,
  SincronizarPncpInput,
} from "@petrus/shared";
import { UF_TO_REGIAO, type Uf } from "@petrus/shared";
import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { PrismaService } from "../prisma/prisma.service";
import { EventosService } from "../eventos/eventos.service";
import { PncpAdapter } from "./portal-adapters/pncp/pncp.adapter";
import { PortalIndisponivelError } from "./portal-adapters/portal-adapter.types";
import { MatchingService } from "./matching/matching.service";

interface SincronizacaoResumo {
  encontradas: number;
  criadas: number;
  atualizadas: number;
}

/** Remove acentos, espaços e caixa para comparar cabeçalhos de planilha com tolerância. */
function normalizarCabecalho(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

@Injectable()
export class LicitacoesService {
  constructor(
    private prisma: PrismaService,
    private eventos: EventosService,
    private pncp: PncpAdapter,
    private matching: MatchingService,
  ) {}

  /** Importa/atualiza licitações do PNCP conforme filtros — nunca cria Participação sozinho. */
  async sincronizarPncp(filtro: SincronizarPncpInput): Promise<SincronizacaoResumo> {
    const resumo: SincronizacaoResumo = { encontradas: 0, criadas: 0, atualizadas: 0 };
    let pagina = 1;
    let totalPaginas = 1;

    do {
      let resultado;
      try {
        resultado = await this.pncp.buscarLicitacoes({
          uf: filtro.uf,
          modalidadeCodigo: filtro.modalidadeCodigo,
          dataInicial: filtro.dataInicial,
          dataFinal: filtro.dataFinal,
          pagina,
        });
      } catch (err) {
        if (err instanceof PortalIndisponivelError) {
          throw new BadGatewayException(err.message);
        }
        throw err;
      }

      totalPaginas = resultado.totalPaginas;
      resumo.encontradas += resultado.licitacoes.length;

      for (const dto of resultado.licitacoes) {
        const existente = await this.prisma.licitacao.findUnique({
          where: {
            fonte_numeroProcesso_orgaoCnpj: {
              fonte: "PNCP",
              numeroProcesso: dto.numeroProcesso,
              orgaoCnpj: dto.orgaoCnpj,
            },
          },
        });

        const dados = {
          idExterno: dto.idExterno,
          orgaoCnpj: dto.orgaoCnpj,
          orgaoNome: dto.orgaoNome,
          esfera: dto.esfera,
          numeroProcesso: dto.numeroProcesso,
          modalidadeCodigo: dto.modalidadeCodigo,
          modalidadeNome: dto.modalidadeNome,
          objeto: dto.objeto,
          valorEstimado: dto.valorEstimado,
          uf: dto.uf,
          municipio: dto.municipio,
          dataPublicacao: dto.dataPublicacao,
          dataLimiteImpugnacao: dto.dataLimiteImpugnacao,
          dataLimiteEsclarecimento: dto.dataLimiteEsclarecimento,
          dataSessaoAbertura: dto.dataSessaoAbertura,
          linkEdital: dto.linkEdital,
          situacao: dto.situacao,
        };

        if (existente) {
          await this.prisma.licitacao.update({ where: { id: existente.id }, data: dados });
          resumo.atualizadas += 1;
        } else {
          await this.prisma.licitacao.create({ data: { fonte: "PNCP", ...dados } });
          resumo.criadas += 1;
        }
      }

      pagina += 1;
    } while (pagina <= totalPaginas);

    return resumo;
  }

  async criarManual(input: CriarLicitacaoManualInput): Promise<LicitacaoResponse> {
    const existente = await this.prisma.licitacao.findUnique({
      where: {
        fonte_numeroProcesso_orgaoCnpj: {
          fonte: "MANUAL",
          numeroProcesso: input.numeroProcesso,
          orgaoCnpj: input.orgaoCnpj,
        },
      },
    });
    if (existente) {
      throw new ConflictException(
        "Já existe uma licitação cadastrada com este número de processo para este órgão.",
      );
    }

    const licitacao = await this.prisma.licitacao.create({
      data: {
        fonte: "MANUAL",
        idExterno: null,
        orgaoCnpj: input.orgaoCnpj,
        orgaoNome: input.orgaoNome,
        esfera: input.esfera ?? null,
        numeroProcesso: input.numeroProcesso,
        modalidadeCodigo: input.modalidadeCodigo ?? null,
        modalidadeNome: input.modalidadeNome,
        objeto: input.objeto,
        valorEstimado: input.valorEstimado ?? null,
        uf: input.uf,
        municipio: input.municipio ?? null,
        dataPublicacao: input.dataPublicacao ? new Date(input.dataPublicacao) : null,
        dataSessaoAbertura: input.dataSessaoAbertura ? new Date(input.dataSessaoAbertura) : null,
        linkEdital: input.linkEdital || null,
      },
    });

    return this.paraResposta(licitacao);
  }

  async listar(filtro: BuscarLicitacoesFiltro): Promise<LicitacaoResponse[]> {
    const where: Prisma.LicitacaoWhereInput = {};

    if (filtro.uf && filtro.uf.length > 0) {
      where.uf = { in: filtro.uf };
    }
    if (filtro.modalidadeCodigo && filtro.modalidadeCodigo.length > 0) {
      where.modalidadeCodigo = { in: filtro.modalidadeCodigo };
    }
    if (filtro.valorMinimo !== undefined) {
      where.valorEstimado = { ...(where.valorEstimado as object), gte: filtro.valorMinimo };
    }
    if (filtro.valorMaximo !== undefined) {
      where.valorEstimado = { ...(where.valorEstimado as object), lte: filtro.valorMaximo };
    }
    if (filtro.palavraChave) {
      where.objeto = { contains: filtro.palavraChave, mode: "insensitive" };
    }
    if (filtro.dataPublicacaoInicio) {
      where.dataPublicacao = { ...(where.dataPublicacao as object), gte: new Date(filtro.dataPublicacaoInicio) };
    }
    if (filtro.dataPublicacaoFim) {
      where.dataPublicacao = { ...(where.dataPublicacao as object), lte: new Date(filtro.dataPublicacaoFim) };
    }

    const licitacoes = await this.prisma.licitacao.findMany({
      where,
      orderBy: { dataPublicacao: "desc" },
      take: 200,
    });

    if (!filtro.clienteId) {
      return licitacoes.map((l) => this.paraResposta(l));
    }

    const cliente = await this.prisma.cliente.findUnique({ where: { id: filtro.clienteId } });
    if (!cliente) {
      return licitacoes.map((l) => this.paraResposta(l));
    }

    const comScore = licitacoes.map((l) => {
      const resultado = this.matching.calcularScore(cliente, l.objeto);
      return { ...this.paraResposta(l), matchScore: resultado.score, matchTermos: resultado.termos };
    });
    comScore.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    return comScore;
  }

  async buscarPorId(id: string): Promise<LicitacaoComItensResponse> {
    const licitacao = await this.prisma.licitacao.findUnique({
      where: { id },
      include: { itens: { orderBy: { numero: "asc" } } },
    });
    if (!licitacao) throw new NotFoundException("Licitação não encontrada.");

    return {
      ...this.paraResposta(licitacao),
      itens: licitacao.itens.map((i) => this.itemParaResposta(i)),
    };
  }

  /**
   * Dispara a captação de itens apenas quando ainda não foi feita — chamado
   * quando a licitação recebe uma Participação (sugestão confirmada ou
   * cadastro manual com intenção de participar), evitando volume
   * desnecessário de chamadas ao portal.
   */
  async garantirItensCaptados(licitacaoId: string): Promise<void> {
    const licitacao = await this.prisma.licitacao.findUniqueOrThrow({ where: { id: licitacaoId } });
    // Editais manuais não têm fonte externa para ressincronizar — itens (se
    // houver) são cadastrados à mão via adicionarItemManual.
    if (licitacao.fonte !== "PNCP" || licitacao.itensCaptadosEm) return;
    await this.atualizarItens(licitacaoId, null);
  }

  /** Botão "Atualizar itens" — ressincroniza e, se já havia itens, registra retificação. */
  async atualizarItens(licitacaoId: string, autorId: string | null): Promise<LicitacaoComItensResponse> {
    const licitacao = await this.prisma.licitacao.findUnique({ where: { id: licitacaoId } });
    if (!licitacao) throw new NotFoundException("Licitação não encontrada.");
    if (licitacao.fonte !== "PNCP" || !licitacao.idExterno) {
      throw new ConflictException("Apenas licitações importadas do PNCP têm itens ressincronizáveis.");
    }

    const jaTinhaItens = licitacao.itensCaptadosEm !== null;
    let itens;
    try {
      itens = await this.pncp.buscarItens({
        idExterno: licitacao.idExterno,
        orgaoCnpj: licitacao.orgaoCnpj,
      });
    } catch (err) {
      if (err instanceof PortalIndisponivelError) {
        throw new BadGatewayException(err.message);
      }
      throw err;
    }

    await this.prisma.$transaction([
      ...itens.map((item) =>
        this.prisma.item.upsert({
          where: { licitacaoId_numero: { licitacaoId, numero: item.numero } },
          create: {
            licitacaoId,
            numero: item.numero,
            descricao: item.descricao,
            unidadeMedida: item.unidadeMedida,
            quantidade: item.quantidade,
            valorUnitarioEstimado: item.valorUnitarioEstimado,
            valorTotalEstimado: item.valorTotalEstimado,
            situacao: item.situacao,
            origem: "AUTO_IMPORTADO",
          },
          update: {
            descricao: item.descricao,
            unidadeMedida: item.unidadeMedida,
            quantidade: item.quantidade,
            valorUnitarioEstimado: item.valorUnitarioEstimado,
            valorTotalEstimado: item.valorTotalEstimado,
            situacao: item.situacao,
          },
        }),
      ),
      this.prisma.licitacao.update({ where: { id: licitacaoId }, data: { itensCaptadosEm: new Date() } }),
    ]);

    await this.eventos.registrar({
      tipo: jaTinhaItens ? "EDITAL_RETIFICADO" : "ITENS_CAPTADOS",
      descricao: jaTinhaItens
        ? "Edital retificado: itens/lotes ressincronizados com o PNCP."
        : "Itens/lotes captados do PNCP.",
      autorId,
      licitacaoId,
    });

    return this.buscarPorId(licitacaoId);
  }

  async adicionarItemManual(
    licitacaoId: string,
    item: { numero: number; descricao: string; unidadeMedida?: string | null; quantidade: number },
  ): Promise<ItemResponse> {
    const licitacao = await this.prisma.licitacao.findUnique({ where: { id: licitacaoId } });
    if (!licitacao) throw new NotFoundException("Licitação não encontrada.");

    const criado = await this.prisma.item.create({
      data: {
        licitacaoId,
        numero: item.numero,
        descricao: item.descricao,
        unidadeMedida: item.unidadeMedida ?? null,
        quantidade: item.quantidade,
        origem: "MANUAL",
      },
    });
    return this.itemParaResposta(criado);
  }

  /** Gera o modelo de planilha (.xlsx) com as colunas esperadas por importarItensPlanilha. */
  async gerarModeloPlanilhaItens(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Itens");
    sheet.addRow(["Número", "Descrição", "Unidade de Medida", "Quantidade", "Valor Unitário Estimado"]);
    sheet.addRow([1, "Exemplo: caneca de porcelana 300ml", "UN", 100, 12.5]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => (col.width = 28));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Importa/atualiza itens em lote a partir de uma planilha .xlsx (colunas do
   * modelo gerado por gerarModeloPlanilhaItens). Faz upsert por número do item
   * — reenviar uma planilha corrigida atualiza os itens já existentes em vez
   * de duplicar. Linhas inválidas são reportadas, não interrompem o lote.
   */
  async importarItensPlanilha(licitacaoId: string, buffer: Buffer): Promise<ImportarItensPlanilhaResponse> {
    const licitacao = await this.prisma.licitacao.findUnique({ where: { id: licitacaoId } });
    if (!licitacao) throw new NotFoundException("Licitação não encontrada.");

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as never);
    } catch {
      throw new BadRequestException("Não foi possível ler o arquivo — envie uma planilha .xlsx válida.");
    }
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      throw new BadRequestException("Planilha vazia. Baixe o modelo e preencha ao menos uma linha de item.");
    }

    const cabecalho: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      cabecalho[col] = normalizarCabecalho(String(cell.value ?? ""));
    });
    const idxNumero = cabecalho.indexOf("numero");
    const idxDescricao = cabecalho.indexOf("descricao");
    const idxUnidade = cabecalho.indexOf("unidademedida");
    const idxQuantidade = cabecalho.indexOf("quantidade");
    const idxValorUnitario = cabecalho.indexOf("valorunitarioestimado");

    if (idxNumero === -1 || idxDescricao === -1 || idxQuantidade === -1) {
      throw new BadRequestException(
        "A planilha precisa ter as colunas Número, Descrição e Quantidade (baixe o modelo para conferir os nomes exatos).",
      );
    }

    let criados = 0;
    let atualizados = 0;
    const erros: { linha: number; mensagem: string }[] = [];

    for (let linha = 2; linha <= sheet.rowCount; linha++) {
      const row = sheet.getRow(linha);
      const vazia = row.values === undefined || (row.values as unknown[]).every((v) => v === undefined || v === null || v === "");
      if (vazia) continue;

      const numero = Number(row.getCell(idxNumero).value);
      const descricao = String(row.getCell(idxDescricao).value ?? "").trim();
      const quantidade = Number(row.getCell(idxQuantidade).value);
      const unidadeMedida = idxUnidade !== -1 ? String(row.getCell(idxUnidade).value ?? "").trim() || null : null;
      const valorRaw = idxValorUnitario !== -1 ? row.getCell(idxValorUnitario).value : null;
      const valorUnitarioEstimado =
        valorRaw !== null && valorRaw !== undefined && String(valorRaw).trim() !== "" ? Number(valorRaw) : null;

      if (!Number.isInteger(numero) || numero <= 0) {
        erros.push({ linha, mensagem: "Número do item inválido ou em branco." });
        continue;
      }
      if (!descricao) {
        erros.push({ linha, mensagem: "Descrição em branco." });
        continue;
      }
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        erros.push({ linha, mensagem: "Quantidade inválida ou em branco." });
        continue;
      }
      if (valorUnitarioEstimado !== null && !Number.isFinite(valorUnitarioEstimado)) {
        erros.push({ linha, mensagem: "Valor unitário estimado inválido." });
        continue;
      }

      const existente = await this.prisma.item.findUnique({
        where: { licitacaoId_numero: { licitacaoId, numero } },
      });

      if (existente) {
        await this.prisma.item.update({
          where: { id: existente.id },
          data: { descricao, unidadeMedida, quantidade, valorUnitarioEstimado, origem: "MANUAL" },
        });
        atualizados += 1;
      } else {
        await this.prisma.item.create({
          data: { licitacaoId, numero, descricao, unidadeMedida, quantidade, valorUnitarioEstimado, origem: "MANUAL" },
        });
        criados += 1;
      }
    }

    if (criados + atualizados > 0) {
      await this.eventos.registrar({
        tipo: "ITENS_IMPORTADOS_PLANILHA",
        descricao: `${criados} item(ns) criado(s) e ${atualizados} atualizado(s) via planilha.`,
        licitacaoId,
      });
    }

    return { criados, atualizados, erros };
  }

  regiaoDaUf(uf: string): string | null {
    return UF_TO_REGIAO[uf as Uf] ?? null;
  }

  private paraResposta(licitacao: {
    id: string;
    fonte: string;
    idExterno: string | null;
    orgaoCnpj: string;
    orgaoNome: string;
    esfera: string | null;
    numeroProcesso: string;
    modalidadeCodigo: string | null;
    modalidadeNome: string;
    objeto: string;
    valorEstimado: unknown;
    uf: string;
    municipio: string | null;
    dataPublicacao: Date | null;
    dataLimiteImpugnacao: Date | null;
    dataLimiteEsclarecimento: Date | null;
    dataSessaoAbertura: Date | null;
    linkEdital: string | null;
    situacao: string | null;
    itensCaptadosEm: Date | null;
    criadoEm: Date;
  }): LicitacaoResponse {
    return {
      id: licitacao.id,
      fonte: licitacao.fonte as LicitacaoResponse["fonte"],
      idExterno: licitacao.idExterno,
      orgaoCnpj: licitacao.orgaoCnpj,
      orgaoNome: licitacao.orgaoNome,
      esfera: licitacao.esfera,
      numeroProcesso: licitacao.numeroProcesso,
      modalidadeCodigo: licitacao.modalidadeCodigo,
      modalidadeNome: licitacao.modalidadeNome,
      objeto: licitacao.objeto,
      valorEstimado: licitacao.valorEstimado === null ? null : Number(licitacao.valorEstimado),
      uf: licitacao.uf,
      municipio: licitacao.municipio,
      dataPublicacao: licitacao.dataPublicacao?.toISOString() ?? null,
      dataLimiteImpugnacao: licitacao.dataLimiteImpugnacao?.toISOString() ?? null,
      dataLimiteEsclarecimento: licitacao.dataLimiteEsclarecimento?.toISOString() ?? null,
      dataSessaoAbertura: licitacao.dataSessaoAbertura?.toISOString() ?? null,
      linkEdital: licitacao.linkEdital,
      situacao: licitacao.situacao,
      itensCaptadosEm: licitacao.itensCaptadosEm?.toISOString() ?? null,
      criadoEm: licitacao.criadoEm.toISOString(),
    };
  }

  private itemParaResposta(item: {
    id: string;
    numero: number;
    descricao: string;
    unidadeMedida: string | null;
    quantidade: unknown;
    valorUnitarioEstimado: unknown;
    valorTotalEstimado: unknown;
    situacao: string | null;
    origem: string;
  }): ItemResponse {
    return {
      id: item.id,
      numero: item.numero,
      descricao: item.descricao,
      unidadeMedida: item.unidadeMedida,
      quantidade: Number(item.quantidade),
      valorUnitarioEstimado: item.valorUnitarioEstimado === null ? null : Number(item.valorUnitarioEstimado),
      valorTotalEstimado: item.valorTotalEstimado === null ? null : Number(item.valorTotalEstimado),
      situacao: item.situacao,
      origem: item.origem as ItemResponse["origem"],
    };
  }
}
