import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EMAIL_ADAPTER } from "./notificacoes.constants";
import type { EmailAdapter } from "./email-adapters/email-adapter.types";

interface EnviarParams {
  destinatarioId: string;
  tipo: string;
  assunto: string;
  corpo: string;
  participacaoId?: string;
  documentoId?: string;
}

/** Todo envio é registrado em Notificacao, com ou sem sucesso — nunca falha silenciosamente. */
@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(EMAIL_ADAPTER) private emailAdapter: EmailAdapter,
  ) {}

  async enviar(params: EnviarParams): Promise<void> {
    const destinatario = await this.prisma.usuario.findUnique({ where: { id: params.destinatarioId } });
    if (!destinatario || !destinatario.ativo) return;

    const notificacao = await this.prisma.notificacao.create({
      data: {
        destinatarioId: params.destinatarioId,
        tipo: params.tipo,
        assunto: params.assunto,
        corpo: params.corpo,
        participacaoId: params.participacaoId,
        documentoId: params.documentoId,
      },
    });

    try {
      await this.emailAdapter.enviar(
        { email: destinatario.email, nome: destinatario.nome },
        params.assunto,
        params.corpo,
      );
      await this.prisma.notificacao.update({
        where: { id: notificacao.id },
        data: { enviadaEm: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Falha ao enviar notificação ${notificacao.id}: ${(err as Error).message}`);
      await this.prisma.notificacao.update({
        where: { id: notificacao.id },
        data: { erro: (err as Error).message },
      });
    }
  }

  /** Já foi enviada uma notificação deste tipo para esta participação nas últimas N horas? */
  async foiEnviadaRecentemente(participacaoId: string, tipo: string, horas: number): Promise<boolean> {
    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);
    const existente = await this.prisma.notificacao.findFirst({
      where: { participacaoId, tipo, criadoEm: { gte: desde } },
    });
    return !!existente;
  }

  /** Mesma checagem de dedup, para notificações referenciando um Documento. */
  async foiEnviadaRecentementeParaDocumento(documentoId: string, tipo: string, horas: number): Promise<boolean> {
    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);
    const existente = await this.prisma.notificacao.findFirst({
      where: { documentoId, tipo, criadoEm: { gte: desde } },
    });
    return !!existente;
  }
}
