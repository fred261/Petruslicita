import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { CriarParticipacaoInput, ParticipacaoResponse, Role } from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EventosService } from "../eventos/eventos.service";
import { MatchingService } from "../licitacoes/matching/matching.service";
import { LicitacoesService } from "../licitacoes/licitacoes.service";

interface Autor {
  userId: string;
  papel: Role;
}

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

    const participacao = await this.prisma.participacao.create({
      data: {
        clienteId: input.clienteId,
        licitacaoId: input.licitacaoId,
        origem,
        responsavelId: cliente.responsavelId ?? autor.userId,
      },
      include: { cliente: true },
    });

    await this.eventos.registrar({
      tipo: "PARTICIPACAO_CRIADA",
      descricao: `Participação criada para ${cliente.razaoSocial} (${origem === "SUGESTAO_MATCHING" ? "sugestão de matching confirmada" : "cadastro manual"}).`,
      autorId: autor.userId,
      licitacaoId: input.licitacaoId,
      participacaoId: participacao.id,
    });

    // Intenção de participar confirmada — dispara captação de itens se ainda
    // não feita. Melhor esforço: se o portal estiver indisponível, a
    // Participação já criada não deve ser desfeita nem reportada como erro.
    try {
      await this.licitacoes.garantirItensCaptados(input.licitacaoId);
    } catch (err) {
      this.logger.warn(`Falha ao captar itens da licitação ${input.licitacaoId}: ${(err as Error).message}`);
    }

    return this.paraResposta(participacao);
  }

  async listarPorCliente(clienteId: string, autor: Autor): Promise<ParticipacaoResponse[]> {
    await this.garantirAcessoAoCliente(clienteId, autor);
    const participacoes = await this.prisma.participacao.findMany({
      where: { clienteId },
      include: { cliente: true },
      orderBy: { criadoEm: "desc" },
    });
    return participacoes.map((p) => this.paraResposta(p));
  }

  /** Só Admin/Master — sigilo entre clientes concorrentes no mesmo edital. */
  async listarPorLicitacao(licitacaoId: string): Promise<ParticipacaoResponse[]> {
    const participacoes = await this.prisma.participacao.findMany({
      where: { licitacaoId },
      include: { cliente: true },
      orderBy: { criadoEm: "desc" },
    });
    return participacoes.map((p) => this.paraResposta(p));
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

  private paraResposta(participacao: {
    id: string;
    clienteId: string;
    cliente: { razaoSocial: string };
    licitacaoId: string;
    status: string;
    origem: string;
    responsavelId: string | null;
    observacoes: string | null;
    criadoEm: Date;
  }): ParticipacaoResponse {
    return {
      id: participacao.id,
      clienteId: participacao.clienteId,
      clienteRazaoSocial: participacao.cliente.razaoSocial,
      licitacaoId: participacao.licitacaoId,
      status: participacao.status as ParticipacaoResponse["status"],
      origem: participacao.origem as ParticipacaoResponse["origem"],
      responsavelId: participacao.responsavelId,
      observacoes: participacao.observacoes,
      criadoEm: participacao.criadoEm.toISOString(),
    };
  }
}
