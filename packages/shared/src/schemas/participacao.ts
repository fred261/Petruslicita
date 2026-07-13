import { z } from "zod";
import { STATUS_PARTICIPACAO, ORIGEM_PARTICIPACAO } from "../domain/participacao";

export const criarParticipacaoSchema = z.object({
  licitacaoId: z.string(),
  clienteId: z.string(),
});
export type CriarParticipacaoInput = z.infer<typeof criarParticipacaoSchema>;

export const participacaoResponseSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  clienteRazaoSocial: z.string(),
  licitacaoId: z.string(),
  status: z.enum(STATUS_PARTICIPACAO),
  origem: z.enum(ORIGEM_PARTICIPACAO),
  responsavelId: z.string().nullable(),
  observacoes: z.string().nullable(),
  criadoEm: z.string(),
});
export type ParticipacaoResponse = z.infer<typeof participacaoResponseSchema>;
