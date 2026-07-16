import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  AtualizarPrazoParticipacaoInput,
  AtualizarStatusParticipacaoInput,
  AtualizarValorPropostoInput,
  ComentarioResponse,
  CriarComentarioInput,
  CriarParticipacaoInput,
  ParticipacaoResponse,
  Role,
  SelecionarItensParticipacaoInput,
} from "@petrus/shared";
import { STATUS_EXIGE_MOTIVO_PERDA, TRANSICOES_PERMITIDAS } from "@petrus/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EventosService } from "../eventos/eventos.service";
import { MatchingService } from "../licitacoes/matching/matching.service";
import { LicitacoesService } from "../licitacoes/licitacoes.service";

interface Autor {
  userId: string;
  papel: Role;
}

const PARTICIPACAO_INCLUDE = {
  cliente: true,
  licitacao: true,
  responsavel: true,
  itens: true,
} satisfies Prisma.ParticipacaoInclude;

type ParticipacaoCompleta = Prisma.ParticipacaoGetPayload<{ include: typeof PARTICIPACAO_INCLUDE }>;

@Injectable()
export class ParticipacoesService {
  private readonly logger = new Logger(ParticipacoesService.name);

  constructor(
    private prisma: PrismaService,
    private eventos: EventosService,
    private matching: MatchingService,
    private licitacoes: LicitacoesService,
  ) {}

  /**
   * Ação humana "Criar Participação" — o motor de matching nunca chega até
   * aqui sozinho, só sugere. A origem (sugestão vs. manual) é inferida pelo
   * próprio score de matching, não recebida do cliente da API.
   */
  async criar(input: CriarParticipacaoInput, autor: Autor): Promise<ParticipacaoResponse> {
    await this.garantirAcessoAoCliente(input.clienteId, autor);

    const [cliente, licitacao] = await Promise.all([
      this.prisma.cliente.findUnique({ where: { id: input.clienteId } }),
      this.prisma.licitacao.findUnique({ where: { id: input.licitacaoId } }),
    ]);
    if (!cliente) throw new NotFoundException("Cliente não encontrado.");
    if (!licitacao) throw new NotFoundException("Licitação não encontrada.");

    const existente = await this.prisma.participacao.findUnique({
      where: { clienteId_licitacaoId: { clienteId: input.clienteId, licitacaoId: input.licitacaoId } },
    });
    if (existente) {
      throw new ConflictException("Já existe uma participação deste cliente nesta licitação.");
    }

    const { score } = this.matching.calcularScore(cliente, licitacao.objeto);
    const origem = score > 0 ? "SUGESTAO_MATCHING" : "MANUAL";

    const criada = await this.prisma.participacao.create({
      data: {
        clienteId: input.clienteId,
        licitacaoId: input.licitacaoId,
        origem,
        responsavelId: cliente.responsavelId ?? autor.userId,
      },
    });

    await this.eventos.registrar({
      tipo: "PARTICIPACAO_CRIADA",
      descricao: `Participação criada para ${cliente.razaoSocial} (${origem === "SUGESTAO_MATCHING" ? "sugestão de matching confirmada" : "cadastro manual"}).`,
      autorId: autor.userId,
      licitacaoId: input.licitacaoId,
      participacaoId: criada.id,
    });

    // Intenção de participar confirmada — dispara captação de itens se ainda
    // não feita. Melhor esforço: se o portal estiver indisponível, a
    // Participação já criada não deve ser desfeita nem reportada como erro.
    try {
      await this.licitacoes.garantirItensCaptados(input.licitacaoId);
    } catch (err) {
      this.logger.warn(`Falha ao captar itens da licitação ${input.licitacaoId}: ${(err as Error).message}`);
    }

    return this.buscarPorId(criada.id, autor);
  }

  async buscarPorId(id: string, autor: Autor): Promise<ParticipacaoResponse> {
    const participacao = await this.prisma.participacao.findUnique({
      where: { id },
      include: PARTICIPACAO_INCLUDE,
    });
    if (!participacao) throw new NotFoundException("Participação não encontrada.");
    await this.garantirAcessoAoCliente(participacao.clienteId, autor);
    return this.paraResposta(participacao);
  }

  async listarPorCliente(clienteId: string, autor: Autor): Promise<ParticipacaoResponse[]> {
    await this.garantirAcessoAoCliente(clienteId, autor);
    const participacoes = await this.prisma.participacao.findMany({
      where: { clienteId },
      include: PARTICIPACAO_INCLUDE,
      orderBy: { criadoEm: "desc" },
    });
    return participacoes.map((p) => this.paraResposta(p));
  }

  /** Só Admin/Master — sigilo entre clientes concorrentes no mesmo edital. */
  async listarPorLicitacao(licitacaoId: string): Promise<ParticipacaoResponse[]> {
    const participacoes = await this.prisma.participacao.findMany({
      where: { licitacaoId },
      include: PARTICIPACAO_INCLUDE,
      orderBy: { criadoEm: "desc" },
    });
    return participacoes.map((p) => this.paraResposta(p));
  }

  async atualizarStatus(
    id: string,
    input: AtualizarStatusParticipacaoInput,
    autor: Autor,
  ): Promise<ParticipacaoResponse> {
    const atual = await this.buscarParaEscrita(id, autor);

    const permitidos = TRANSICOES_PERMITIDAS[atual.status];
    if (!permitidos.includes(input.status)) {
      throw new BadRequestException(
        `Não é possível mudar de "${atual.status}" para "${input.status}" diretamente.`,
      );
    }

    if (STATUS_EXIGE_MOTIVO_PERDA.includes(input.status) && !input.motivoPerda) {
      throw new BadRequestException("Informe o motivo ao descartar ou marcar como não vencedora.");
    }

    const diferencaPercentual = this.calcularDiferencaPercentual(
      input.motivoPerda?.valorPropostaVencedora ?? null,
      atual.valorProposto ? Number(atual.valorProposto) : null,
    );

    const dataDecisao =
      atual.dataDecisao ??
      (["DESCARTADA", "VENCEDORA", "NAO_VENCEDORA"].includes(input.status) ? new Date() : null);

    const atualizada = await this.prisma.participacao.update({
      where: { id },
      data: {
        status: input.status,
        dataDecisao,
        ...(input.motivoPerda
          ? {
              motivoPerdaCategoria: input.motivoPerda.categoria,
              motivoPerdaTexto: input.motivoPerda.textoLivre ?? null,
              concorrenteVencedorNome: input.motivoPerda.concorrenteVencedorNome ?? null,
              concorrenteVencedorCnpj: input.motivoPerda.concorrenteVencedorCnpj ?? null,
              valorPropostaVencedora: input.motivoPerda.valorPropostaVencedora ?? null,
              diferencaPercentualVencedora: diferencaPercentual,
            }
          : {}),
      },
      include: PARTICIPACAO_INCLUDE,
    });

    await this.eventos.registrar({
      tipo: "STATUS_ALTERADO",
      descricao: `Status alterado de "${atual.status}" para "${input.status}".`,
      autorId: autor.userId,
      licitacaoId: atual.licitacaoId,
      participacaoId: id,
    });

    return this.paraResposta(atualizada);
  }

  async atualizarPrazo(
    id: string,
    input: AtualizarPrazoParticipacaoInput,
    autor: Autor,
  ): Promise<ParticipacaoResponse> {
    const atual = await this.buscarParaEscrita(id, autor);

    const atualizada = await this.prisma.participacao.update({
      where: { id },
      data: { proximoPrazo: input.proximoPrazo ? new Date(input.proximoPrazo) : null },
      include: PARTICIPACAO_INCLUDE,
    });

    await this.eventos.registrar({
      tipo: "PRAZO_ATUALIZADO",
      descricao: input.proximoPrazo
        ? `Próximo prazo definido para ${new Date(input.proximoPrazo).toLocaleDateString("pt-BR")}.`
        : "Próximo prazo removido.",
      autorId: autor.userId,
      licitacaoId: atual.licitacaoId,
      participacaoId: id,
    });

    return this.paraResposta(atualizada);
  }

  async atualizarValorProposto(
    id: string,
    input: AtualizarValorPropostoInput,
    autor: Autor,
  ): Promise<ParticipacaoResponse> {
    const atual = await this.buscarParaEscrita(id, autor);

    const diferencaPercentual = this.calcularDiferencaPercentual(
      atual.valorPropostaVencedora ? Number(atual.valorPropostaVencedora) : null,
      input.valorProposto,
    );

    const atualizada = await this.prisma.participacao.update({
      where: { id },
      data: {
        valorProposto: input.valorProposto,
        ...(atual.valorPropostaVencedora ? { diferencaPercentualVencedora: diferencaPercentual } : {}),
      },
      include: PARTICIPACAO_INCLUDE,
    });

    await this.eventos.registrar({
      tipo: "VALOR_PROPOSTO_ATUALIZADO",
      descricao:
        input.valorProposto !== null
          ? `Valor proposto atualizado para ${input.valorProposto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
          : "Valor proposto removido.",
      autorId: autor.userId,
      licitacaoId: atual.licitacaoId,
      participacaoId: id,
    });

    return this.paraResposta(atualizada);
  }

  async selecionarItens(
    id: string,
    input: SelecionarItensParticipacaoInput,
    autor: Autor,
  ): Promise<ParticipacaoResponse> {
    const atual = await this.buscarParaEscrita(id, autor);

    if (input.itemIds.length > 0) {
      const count = await this.prisma.item.count({
        where: { id: { in: input.itemIds }, licitacaoId: atual.licitacaoId },
      });
      if (count !== input.itemIds.length) {
        throw new BadRequestException("Um ou mais itens não pertencem a esta licitação.");
      }
    }

    await this.prisma.$transaction([
      this.prisma.participacaoItem.deleteMany({ where: { participacaoId: id } }),
      this.prisma.participacaoItem.createMany({
        data: input.itemIds.map((itemId) => ({ participacaoId: id, itemId })),
      }),
    ]);

    await this.eventos.registrar({
      tipo: "ITENS_SELECIONADOS",
      descricao: `${input.itemIds.length} item(ns) selecionado(s) para disputa.`,
      autorId: autor.userId,
      licitacaoId: atual.licitacaoId,
      participacaoId: id,
    });

    return this.buscarPorId(id, autor);
  }

  async comentar(id: string, input: CriarComentarioInput, autor: Autor): Promise<ComentarioResponse> {
    await this.buscarParaEscrita(id, autor);
    const comentario = await this.prisma.comentario.create({
      data: { participacaoId: id, autorId: autor.userId, texto: input.texto },
      include: { autor: true },
    });
    return {
      id: comentario.id,
      texto: comentario.texto,
      autorNome: comentario.autor?.nome ?? null,
      criadoEm: comentario.criadoEm.toISOString(),
    };
  }

  async listarComentarios(id: string, autor: Autor): Promise<ComentarioResponse[]> {
    const participacao = await this.prisma.participacao.findUnique({ where: { id } });
    if (!participacao) throw new NotFoundException("Participação não encontrada.");
    await this.garantirAcessoAoCliente(participacao.clienteId, autor);

    const comentarios = await this.prisma.comentario.findMany({
      where: { participacaoId: id },
      include: { autor: true },
      orderBy: { criadoEm: "desc" },
    });
    return comentarios.map((c) => ({
      id: c.id,
      texto: c.texto,
      autorNome: c.autor?.nome ?? null,
      criadoEm: c.criadoEm.toISOString(),
    }));
  }

  private async buscarParaEscrita(id: string, autor: Autor) {
    const participacao = await this.prisma.participacao.findUnique({ where: { id } });
    if (!participacao) throw new NotFoundException("Participação não encontrada.");
    await this.garantirAcessoAoCliente(participacao.clienteId, autor);
    return participacao;
  }

  private calcularDiferencaPercentual(valorVencedora: number | null, valorProposto: number | null): number | null {
    if (valorVencedora === null || !valorProposto) return null;
    return Math.round(((valorVencedora - valorProposto) / valorProposto) * 100 * 100) / 100;
  }

  private async garantirAcessoAoCliente(clienteId: string, autor: Autor): Promise<void> {
    if (autor.papel === "MASTER" || autor.papel === "ADMIN") return;
    const vinculo = await this.prisma.usuarioCliente.findUnique({
      where: { usuarioId_clienteId: { usuarioId: autor.userId, clienteId } },
    });
    if (!vinculo) {
      throw new ForbiddenException("Você não tem acesso a este cliente.");
    }
  }

  private paraResposta(participacao: ParticipacaoCompleta): ParticipacaoResponse {
    return {
      id: participacao.id,
      clienteId: participacao.clienteId,
      clienteRazaoSocial: participacao.cliente.razaoSocial,
      licitacaoId: participacao.licitacaoId,
      licitacaoOrgaoNome: participacao.licitacao.orgaoNome,
      licitacaoObjeto: participacao.licitacao.objeto,
      licitacaoNumeroProcesso: participacao.licitacao.numeroProcesso,
      status: participacao.status as ParticipacaoResponse["status"],
      origem: participacao.origem as ParticipacaoResponse["origem"],
      responsavelId: participacao.responsavelId,
      responsavelNome: participacao.responsavel?.nome ?? null,
      observacoes: participacao.observacoes,
      proximoPrazo: participacao.proximoPrazo?.toISOString() ?? null,
      valorProposto: participacao.valorProposto ? Number(participacao.valorProposto) : null,
      dataDecisao: participacao.dataDecisao?.toISOString() ?? null,
      motivoPerdaCategoria: participacao.motivoPerdaCategoria as ParticipacaoResponse["motivoPerdaCategoria"],
      motivoPerdaTexto: participacao.motivoPerdaTexto,
      concorrenteVencedorNome: participacao.concorrenteVencedorNome,
      concorrenteVencedorCnpj: participacao.concorrenteVencedorCnpj,
      valorPropostaVencedora: participacao.valorPropostaVencedora
        ? Number(participacao.valorPropostaVencedora)
        : null,
      diferencaPercentualVencedora: participacao.diferencaPercentualVencedora
        ? Number(participacao.diferencaPercentualVencedora)
        : null,
      itemIds: participacao.itens.map((i) => i.itemId),
      criadoEm: participacao.criadoEm.toISOString(),
    };
  }
}
