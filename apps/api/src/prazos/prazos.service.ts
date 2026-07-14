import { Injectable, Logger } from "@nestjs/common";
import { STATUS_TERMINAIS, type PendenciaResponse, type Role } from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";
import { NotificacoesService } from "../notificacoes/notificacoes.service";
import { ConfiguracaoService } from "./configuracao.service";

interface Autor {
  userId: string;
  papel: Role;
}

interface ResumoExecucao {
  participacoesAvaliadas: number;
  cobrancasEnviadas: number;
  escalonamentosEnviados: number;
}

const TIPO_COBRANCA_PRAZO = "COBRANCA_PRAZO";
const TIPO_COBRANCA_SEM_PRAZO = "COBRANCA_SEM_PRAZO";
const TIPO_ESCALONAMENTO = "ESCALONAMENTO";

@Injectable()
export class PrazosService {
  private readonly logger = new Logger(PrazosService.name);

  constructor(
    private prisma: PrismaService,
    private notificacoes: NotificacoesService,
    private configuracao: ConfiguracaoService,
  ) {}

  /**
   * Tick do motor de prazos — roda periodicamente (fila BullMQ). Cobra
   * atualização quando há prazo definido (com antecedência configurável) ou
   * semanalmente quando não há, e escalona ao Administrador quando o
   * responsável não atualiza dentro da tolerância configurada.
   */
  async executarVerificacao(): Promise<ResumoExecucao> {
    const config = await this.configuracao.obter();
    const agora = new Date();

    const participacoes = await this.prisma.participacao.findMany({
      where: { status: { notIn: STATUS_TERMINAIS } },
      include: { cliente: true, licitacao: true },
    });

    let cobrancasEnviadas = 0;

    for (const participacao of participacoes) {
      const destinatarioId = participacao.responsavelId ?? participacao.cliente.responsavelId;
      if (!destinatarioId) continue;

      if (participacao.proximoPrazo) {
        const limiteAviso = new Date(
          participacao.proximoPrazo.getTime() - config.diasAntecedenciaPrazo * 24 * 60 * 60 * 1000,
        );
        const jaEnviada = await this.notificacoes.foiEnviadaRecentemente(
          participacao.id,
          TIPO_COBRANCA_PRAZO,
          20,
        );
        if (agora >= limiteAviso && !jaEnviada) {
          const atrasado = agora > participacao.proximoPrazo;
          await this.notificacoes.enviar({
            destinatarioId,
            tipo: TIPO_COBRANCA_PRAZO,
            participacaoId: participacao.id,
            assunto: atrasado
              ? `[Atrasado] Atualize a participação em ${participacao.licitacao.orgaoNome}`
              : `Prazo se aproximando — ${participacao.licitacao.orgaoNome}`,
            corpo: this.corpoCobrancaPrazo(participacao, atrasado),
          });
          cobrancasEnviadas += 1;
        }
      } else {
        const horasSemAtualizacao = (agora.getTime() - participacao.atualizadoEm.getTime()) / 3_600_000;
        const jaEnviada = await this.notificacoes.foiEnviadaRecentemente(
          participacao.id,
          TIPO_COBRANCA_SEM_PRAZO,
          Math.max(config.intervaloCobrancaSemPrazoHoras - 1, 1),
        );
        if (horasSemAtualizacao >= config.intervaloCobrancaSemPrazoHoras && !jaEnviada) {
          await this.notificacoes.enviar({
            destinatarioId,
            tipo: TIPO_COBRANCA_SEM_PRAZO,
            participacaoId: participacao.id,
            assunto: `Atualize a participação em ${participacao.licitacao.orgaoNome}`,
            corpo: this.corpoCobrancaSemPrazo(participacao),
          });
          cobrancasEnviadas += 1;
        }
      }
    }

    const escalonamentosEnviados = await this.executarEscalonamento(config.toleranciaEscalonamentoHoras);

    this.logger.log(
      `Verificação de prazos concluída: ${participacoes.length} participações avaliadas, ${cobrancasEnviadas} cobrança(s), ${escalonamentosEnviados} escalonamento(s).`,
    );

    return { participacoesAvaliadas: participacoes.length, cobrancasEnviadas, escalonamentosEnviados };
  }

  private async executarEscalonamento(toleranciaHoras: number): Promise<number> {
    const limite = new Date(Date.now() - toleranciaHoras * 60 * 60 * 1000);

    const cobrancasPendentes = await this.prisma.notificacao.findMany({
      where: {
        tipo: { in: [TIPO_COBRANCA_PRAZO, TIPO_COBRANCA_SEM_PRAZO] },
        enviadaEm: { lte: limite },
        participacaoId: { not: null },
      },
      orderBy: { enviadaEm: "desc" },
    });

    // Considera só a cobrança mais recente por participação.
    const maisRecentePorParticipacao = new Map<string, (typeof cobrancasPendentes)[number]>();
    for (const c of cobrancasPendentes) {
      if (!c.participacaoId) continue;
      if (!maisRecentePorParticipacao.has(c.participacaoId)) {
        maisRecentePorParticipacao.set(c.participacaoId, c);
      }
    }

    const admins = await this.prisma.usuario.findMany({
      where: { papel: { in: ["MASTER", "ADMIN"] }, ativo: true },
    });
    if (admins.length === 0) return 0;

    let enviados = 0;

    for (const [participacaoId, cobranca] of maisRecentePorParticipacao) {
      const participacao = await this.prisma.participacao.findUnique({
        where: { id: participacaoId },
        include: { cliente: true, licitacao: true, responsavel: true },
      });
      if (!participacao || STATUS_TERMINAIS.includes(participacao.status)) continue;
      if (!cobranca.enviadaEm || participacao.atualizadoEm >= cobranca.enviadaEm) continue;

      const jaEscalonado = await this.prisma.notificacao.findFirst({
        where: {
          participacaoId,
          tipo: TIPO_ESCALONAMENTO,
          criadoEm: { gte: cobranca.enviadaEm },
        },
      });
      if (jaEscalonado) continue;

      for (const admin of admins) {
        await this.notificacoes.enviar({
          destinatarioId: admin.id,
          tipo: TIPO_ESCALONAMENTO,
          participacaoId,
          assunto: `Sem resposta: ${participacao.licitacao.orgaoNome} (${participacao.cliente.razaoSocial})`,
          corpo:
            `O responsável ${participacao.responsavel?.nome ?? "não definido"} não atualizou a ` +
            `participação de ${participacao.cliente.razaoSocial} em ${participacao.licitacao.orgaoNome} ` +
            `(processo ${participacao.licitacao.numeroProcesso}) nas últimas ${toleranciaHoras}h após a cobrança.`,
        });
        enviados += 1;
      }
    }

    return enviados;
  }

  async listarPendencias(autor: Autor): Promise<PendenciaResponse[]> {
    const config = await this.configuracao.obter();
    const agora = new Date();
    const limiteVencendo = new Date(agora.getTime() + config.diasAntecedenciaPrazo * 24 * 60 * 60 * 1000);

    const where =
      autor.papel === "MASTER" || autor.papel === "ADMIN"
        ? { status: { notIn: STATUS_TERMINAIS } }
        : { status: { notIn: STATUS_TERMINAIS }, responsavelId: autor.userId };

    const participacoes = await this.prisma.participacao.findMany({
      where,
      include: { cliente: true, licitacao: true, responsavel: true },
      orderBy: [{ proximoPrazo: "asc" }, { atualizadoEm: "asc" }],
    });

    return participacoes.map((p) => {
      let urgencia: PendenciaResponse["urgencia"];
      if (!p.proximoPrazo) urgencia = "SEM_PRAZO";
      else if (p.proximoPrazo < agora) urgencia = "ATRASADO";
      else if (p.proximoPrazo <= limiteVencendo) urgencia = "VENCENDO";
      else urgencia = "PROXIMO";

      return {
        participacaoId: p.id,
        clienteId: p.clienteId,
        clienteRazaoSocial: p.cliente.razaoSocial,
        licitacaoOrgaoNome: p.licitacao.orgaoNome,
        licitacaoNumeroProcesso: p.licitacao.numeroProcesso,
        status: p.status as PendenciaResponse["status"],
        proximoPrazo: p.proximoPrazo?.toISOString() ?? null,
        urgencia,
        responsavelId: p.responsavelId,
        responsavelNome: p.responsavel?.nome ?? null,
      };
    });
  }

  private corpoCobrancaPrazo(
    participacao: { licitacao: { orgaoNome: string; numeroProcesso: string }; proximoPrazo: Date | null },
    atrasado: boolean,
  ): string {
    const dataFormatada = participacao.proximoPrazo?.toLocaleDateString("pt-BR") ?? "";
    return atrasado
      ? `O prazo de ${dataFormatada} para ${participacao.licitacao.orgaoNome} (processo ${participacao.licitacao.numeroProcesso}) já passou. Atualize a participação assim que possível.`
      : `O prazo de ${dataFormatada} para ${participacao.licitacao.orgaoNome} (processo ${participacao.licitacao.numeroProcesso}) está se aproximando. Atualize a participação.`;
  }

  private corpoCobrancaSemPrazo(participacao: {
    licitacao: { orgaoNome: string; numeroProcesso: string };
  }): string {
    return `Não há atualização recente na participação em ${participacao.licitacao.orgaoNome} (processo ${participacao.licitacao.numeroProcesso}). Atualize o status ou defina um próximo prazo.`;
  }
}
