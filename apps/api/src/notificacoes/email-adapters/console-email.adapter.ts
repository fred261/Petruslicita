import { Injectable, Logger } from "@nestjs/common";
import type { EmailAdapter, EmailDestinatario } from "./email-adapter.types";

/**
 * Adaptador padrão quando não há provedor de e-mail configurado (dev, ou
 * ambientes sem RESEND_API_KEY). Não falha silenciosamente: registra o
 * conteúdo completo no log para que o fluxo seja auditável mesmo sem envio real.
 */
@Injectable()
export class ConsoleEmailAdapter implements EmailAdapter {
  readonly nome = "Console (sem provedor configurado)";
  private readonly logger = new Logger("EmailSimulado");

  async enviar(destinatario: EmailDestinatario, assunto: string, corpo: string): Promise<void> {
    this.logger.log(
      `Para: ${destinatario.nome} <${destinatario.email}>\nAssunto: ${assunto}\n${corpo}`,
    );
  }
}
