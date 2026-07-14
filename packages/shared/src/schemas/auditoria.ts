import { z } from "zod";

export const ACAO_AUDITORIA = ["CREATE", "UPDATE", "DELETE"] as const;
export type AcaoAuditoria = (typeof ACAO_AUDITORIA)[number];

export const ACAO_AUDITORIA_LABELS: Record<AcaoAuditoria, string> = {
  CREATE: "Criação",
  UPDATE: "Atualização",
  DELETE: "Exclusão",
};

export const filtroAuditLogSchema = z.object({
  entidade: z.string().optional(),
  usuarioId: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(500).optional(),
});
export type FiltroAuditLogInput = z.infer<typeof filtroAuditLogSchema>;

export const auditLogResponseSchema = z.object({
  id: z.string(),
  usuarioId: z.string().nullable(),
  usuarioNome: z.string().nullable(),
  entidade: z.string(),
  entidadeId: z.string(),
  acao: z.enum(ACAO_AUDITORIA),
  dadosAntes: z.unknown().nullable(),
  dadosDepois: z.unknown().nullable(),
  criadoEm: z.string(),
});
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

export const filtroAccessLogSchema = z.object({
  usuarioId: z.string().optional(),
  sucesso: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(500).optional(),
});
export type FiltroAccessLogInput = z.infer<typeof filtroAccessLogSchema>;

export const accessLogResponseSchema = z.object({
  id: z.string(),
  usuarioId: z.string().nullable(),
  usuarioNome: z.string().nullable(),
  email: z.string(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  sucesso: z.boolean(),
  motivo: z.string().nullable(),
  criadoEm: z.string(),
});
export type AccessLogResponse = z.infer<typeof accessLogResponseSchema>;

export const aplicarRetencaoResponseSchema = z.object({
  auditLogsRemovidos: z.number(),
  accessLogsRemovidos: z.number(),
});
export type AplicarRetencaoResponse = z.infer<typeof aplicarRetencaoResponseSchema>;
