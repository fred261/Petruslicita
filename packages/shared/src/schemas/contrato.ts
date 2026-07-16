import { z } from "zod";
import { STATUS_CONTRATO, TIPO_ITEM_CRONOGRAMA } from "../domain/contratos";

export const criarContratoSchema = z.object({
  numero: z.string().min(1),
  valorFinal: z.number().nonnegative(),
  vigenciaInicio: z.string(),
  vigenciaFim: z.string(),
  observacoes: z.string().optional(),
});
export type CriarContratoInput = z.infer<typeof criarContratoSchema>;

export const atualizarContratoSchema = z.object({
  numero: z.string().min(1).optional(),
  valorFinal: z.number().nonnegative().optional(),
  vigenciaInicio: z.string().optional(),
  vigenciaFim: z.string().optional(),
  status: z.enum(STATUS_CONTRATO).optional(),
  observacoes: z.string().optional(),
});
export type AtualizarContratoInput = z.infer<typeof atualizarContratoSchema>;

export const itemCronogramaResponseSchema = z.object({
  id: z.string(),
  tipo: z.enum(TIPO_ITEM_CRONOGRAMA),
  descricao: z.string(),
  dataPrevista: z.string(),
  valorPrevisto: z.number().nullable(),
  concluido: z.boolean(),
  dataConclusao: z.string().nullable(),
});
export type ItemCronogramaResponse = z.infer<typeof itemCronogramaResponseSchema>;

export const criarItemCronogramaSchema = z.object({
  tipo: z.enum(TIPO_ITEM_CRONOGRAMA),
  descricao: z.string().min(1),
  dataPrevista: z.string(),
  valorPrevisto: z.number().nonnegative().optional(),
});
export type CriarItemCronogramaInput = z.infer<typeof criarItemCronogramaSchema>;

export const contratoResponseSchema = z.object({
  id: z.string(),
  participacaoId: z.string(),
  numero: z.string(),
  valorFinal: z.number(),
  vigenciaInicio: z.string(),
  vigenciaFim: z.string(),
  status: z.enum(STATUS_CONTRATO),
  observacoes: z.string().nullable(),
  cronograma: z.array(itemCronogramaResponseSchema),
  criadoEm: z.string(),
});
export type ContratoResponse = z.infer<typeof contratoResponseSchema>;
