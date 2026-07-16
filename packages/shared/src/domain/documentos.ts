export const STATUS_DOCUMENTO = ["VALIDO", "VENCIDO", "SEM_VALIDADE"] as const;
export type StatusDocumento = (typeof STATUS_DOCUMENTO)[number];

export const STATUS_DOCUMENTO_LABELS: Record<StatusDocumento, string> = {
  VALIDO: "Válido",
  VENCIDO: "Vencido",
  SEM_VALIDADE: "Sem validade",
};

/** Tamanho máximo de upload aceito (bytes) — mantido em sincronia com o multer do backend. */
export const TAMANHO_MAXIMO_DOCUMENTO_BYTES = 15 * 1024 * 1024;
