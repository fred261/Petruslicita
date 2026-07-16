export interface EmailDestinatario {
  email: string;
  nome: string;
}

export interface EmailAdapter {
  readonly nome: string;
  enviar(destinatario: EmailDestinatario, assunto: string, corpo: string): Promise<void>;
}

export class EmailIndisponivelError extends Error {}
