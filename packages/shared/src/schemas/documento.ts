import { z } from "zod";
import { STATUS_DOCUMENTO } from "../domain/documentos";

export const documentoResponseSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  nomeArquivo: z.string(),
  mimeType: z.string(),
  tamanhoBytes: z.number(),
  dataEmissao: z.string().nullable(),
  dataValidade: z.string().nullable(),
  status: z.enum(STATUS_DOCUMENTO),
  clienteId: z.string().nullable(),
  participacaoId: z.string().nullable(),
  uploadedByNome: z.string().nullable(),
  criadoEm: z.string(),
});
export type DocumentoResponse = z.infer<typeof documentoResponseSchema>;

export const criarModeloDocumentoSchema = z.object({
  nome: z.string().min(2),
  categoria: z.string().optional(),
  validadeEmDiasPadrao: z.number().int().positive().nullable().optional(),
});
export type CriarModeloDocumentoInput = z.infer<typeof criarModeloDocumentoSchema>;

export const atualizarModeloDocumentoSchema = z.object({
  nome: z.string().min(2).optional(),
  categoria: z.string().optional(),
  validadeEmDiasPadrao: z.number().int().positive().nullable().optional(),
  ativo: z.boolean().optional(),
});
export type AtualizarModeloDocumentoInput = z.infer<typeof atualizarModeloDocumentoSchema>;

export const modeloDocumentoResponseSchema = z.object({
  id: z.string(),
  nome: z.string(),
  categoria: z.string().nullable(),
  validadeEmDiasPadrao: z.number().nullable(),
  ativo: z.boolean(),
});
export type ModeloDocumentoResponse = z.infer<typeof modeloDocumentoResponseSchema>;
