import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EmailAdapter, EmailDestinatario } from "./email-adapter.types";
import { EmailIndisponivelError } from "./email-adapter.types";

/** Provedor real (https://resend.com/docs/api-reference/emails/send-email). */
@Injectable()
export class ResendEmailAdapter implements EmailAdapter {
  readonly nome = "Resend";
  private readonly logger = new Logger(ResendEmailAdapter.name);

  constructor(private config: ConfigService) {}

  async enviar(destinatario: EmailDestinatario, assunto: string, corpo: string): Promise<void> {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("EMAIL_FROM");

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [destinatario.email],
          subject: assunto,
          text: corpo,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      this.logger.warn(`Falha ao enviar e-mail via Resend: ${(err as Error).message}`);
      throw new EmailIndisponivelError("Provedor de e-mail indisponível no momento.");
    }

    if (!response.ok) {
      throw new EmailIndisponivelError(`Resend retornou status ${response.status}.`);
    }
  }
}
