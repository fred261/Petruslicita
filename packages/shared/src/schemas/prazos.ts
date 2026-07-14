import { z } from "zod";
import { STATUS_PARTICIPACAO } from "../domain/participacao";
import { URGENCIA_PENDENCIA } from "../domain/prazos";

export const pendenciaResponseSchema = z.object({
  participacaoId: z.string(),
  clienteId: z.string(),
  clienteRazaoSocial: z.string(),
  licitacaoOrgaoNome: z.string(),
  licitacaoNumeroProcesso: z.string(),
  status: z.enum(STATUS_PARTICIPACAO),
  proximoPrazo: z.string().nullable(),
  urgencia: z.enum(URGENCIA_PENDENCIA),
  responsavelId: z.string().nullable(),
  responsavelNome: z.string().nullable(),
});
export type PendenciaResponse = z.infer<typeof pendenciaResponseSchema>;

export const configuracaoSistemaSchema = z.object({
  diasAntecedenciaPrazo: z.number().int().min(0).max(30),
  intervaloCobrancaSemPrazoHoras: z.number().int().min(1).max(720),
  toleranciaEscalonamentoHoras: z.number().int().min(1).max(240),
});
export type ConfiguracaoSistemaInput = z.infer<typeof configuracaoSistemaSchema>;

export const configuracaoSistemaResponseSchema = configuracaoSistemaSchema.extend({
  atualizadoEm: z.string(),
});
export type ConfiguracaoSistemaResponse = z.infer<typeof configuracaoSistemaResponseSchema>;
