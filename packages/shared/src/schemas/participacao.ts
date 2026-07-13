import { z } from "zod";
import {
  STATUS_PARTICIPACAO,
  ORIGEM_PARTICIPACAO,
  MOTIVO_PERDA_CATEGORIAS,
} from "../domain/participacao";

export const criarParticipacaoSchema = z.object({
  licitacaoId: z.string(),
  clienteId: z.string(),
});
export type CriarParticipacaoInput = z.infer<typeof criarParticipacaoSchema>;

export const motivoPerdaSchema = z.object({
  categoria: z.enum(MOTIVO_PERDA_CATEGORIAS),
  textoLivre: z.string().optional(),
  concorrenteVencedorNome: z.string().optional(),
  concorrenteVencedorCnpj: z.string().optional(),
  valorPropostaVencedora: z.number().nonnegative().optional(),
});
export type MotivoPerdaInput = z.infer<typeof motivoPerdaSchema>;

export const atualizarStatusParticipacaoSchema = z.object({
  status: z.enum(STATUS_PARTICIPACAO),
  /** Obrigatório quando o novo status é Descartada ou Não vencedora. */
  motivoPerda: motivoPerdaSchema.optional(),
});
export type AtualizarStatusParticipacaoInput = z.infer<typeof atualizarStatusParticipacaoSchema>;

export const atualizarPrazoParticipacaoSchema = z.object({
  proximoPrazo: z.string().nullable(),
});
export type AtualizarPrazoParticipacaoInput = z.infer<typeof atualizarPrazoParticipacaoSchema>;

export const atualizarValorPropostoSchema = z.object({
  valorProposto: z.number().nonnegative().nullable(),
});
export type AtualizarValorPropostoInput = z.infer<typeof atualizarValorPropostoSchema>;

export const selecionarItensParticipacaoSchema = z.object({
  itemIds: z.array(z.string()),
});
export type SelecionarItensParticipacaoInput = z.infer<typeof selecionarItensParticipacaoSchema>;

export const criarComentarioSchema = z.object({
  texto: z.string().min(1),
});
export type CriarComentarioInput = z.infer<typeof criarComentarioSchema>;

export const comentarioResponseSchema = z.object({
  id: z.string(),
  texto: z.string(),
  autorNome: z.string().nullable(),
  criadoEm: z.string(),
});
export type ComentarioResponse = z.infer<typeof comentarioResponseSchema>;

export const participacaoResponseSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  clienteRazaoSocial: z.string(),
  licitacaoId: z.string(),
  licitacaoOrgaoNome: z.string(),
  licitacaoObjeto: z.string(),
  licitacaoNumeroProcesso: z.string(),
  status: z.enum(STATUS_PARTICIPACAO),
  origem: z.enum(ORIGEM_PARTICIPACAO),
  responsavelId: z.string().nullable(),
  responsavelNome: z.string().nullable(),
  observacoes: z.string().nullable(),
  proximoPrazo: z.string().nullable(),
  valorProposto: z.number().nullable(),
  dataDecisao: z.string().nullable(),
  motivoPerdaCategoria: z.enum(MOTIVO_PERDA_CATEGORIAS).nullable(),
  motivoPerdaTexto: z.string().nullable(),
  concorrenteVencedorNome: z.string().nullable(),
  concorrenteVencedorCnpj: z.string().nullable(),
  valorPropostaVencedora: z.number().nullable(),
  diferencaPercentualVencedora: z.number().nullable(),
  itemIds: z.array(z.string()),
  criadoEm: z.string(),
});
export type ParticipacaoResponse = z.infer<typeof participacaoResponseSchema>;
