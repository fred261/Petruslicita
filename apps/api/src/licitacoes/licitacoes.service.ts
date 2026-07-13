import { BadGatewayException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  BuscarLicitacoesFiltro,
  CriarLicitacaoManualInput,
  ItemResponse,
  LicitacaoComItensResponse,
  LicitacaoResponse,
  SincronizarPncpInput,
} from "@petrus/shared";
import { UF_TO_REGIAO, type Uf } from "@petrus/shared";
import { Prisma } from "@prisma/client";
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
