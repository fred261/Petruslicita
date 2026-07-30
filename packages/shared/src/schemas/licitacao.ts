import { z } from "zod";
import { UFS } from "../regioes";

export const itemResponseSchema = z.object({
  id: z.string(),
  numero: z.number(),
  descricao: z.string(),
  unidadeMedida: z.string().nullable(),
  quantidade: z.number(),
  valorUnitarioEstimado: z.number().nullable(),
  valorTotalEstimado: z.number().nullable(),
  situacao: z.string().nullable(),
  origem: z.enum(["AUTO_IMPORTADO", "MANUAL"]),
});
export type ItemResponse = z.infer<typeof itemResponseSchema>;

export const importarItensPlanilhaResponseSchema = z.object({
  criados: z.number(),
  atualizados: z.number(),
  erros: z.array(z.object({ linha: z.number(), mensagem: z.string() })),
});
export type ImportarItensPlanilhaResponse = z.infer<typeof importarItensPlanilhaResponseSchema>;

export const licitacaoResponseSchema = z.object({
  id: z.string(),
  fonte: z.enum(["PNCP", "MANUAL"]),
  idExterno: z.string().nullable(),
  orgaoCnpj: z.string(),
  orgaoNome: z.string(),
  esfera: z.string().nullable(),
  numeroProcesso: z.string(),
  modalidadeCodigo: z.string().nullable(),
  modalidadeNome: z.string(),
  objeto: z.string(),
  valorEstimado: z.number().nullable(),
  uf: z.string(),
  municipio: z.string().nullable(),
  dataPublicacao: z.string().nullable(),
  dataLimiteImpugnacao: z.string().nullable(),
  dataLimiteEsclarecimento: z.string().nullable(),
  dataSessaoAbertura: z.string().nullable(),
  linkEdital: z.string().nullable(),
  situacao: z.string().nullable(),
  itensCaptadosEm: z.string().nullable(),
  criadoEm: z.string(),
  /** Presente apenas quando a listagem é filtrada/ordenada por matching de um cliente. */
  matchScore: z.number().optional(),
  matchTermos: z.array(z.string()).optional(),
});
export type LicitacaoResponse = z.infer<typeof licitacaoResponseSchema>;

export const licitacaoComItensResponseSchema = licitacaoResponseSchema.extend({
  itens: z.array(itemResponseSchema),
});
export type LicitacaoComItensResponse = z.infer<typeof licitacaoComItensResponseSchema>;

/** Aceita lista real (uso interno) ou string separada por vírgula (querystring HTTP). */
const listaOuCsv = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" ? v.split(",").filter(Boolean) : v), z.array(schema).optional());

export const buscarLicitacoesFiltroSchema = z.object({
  uf: listaOuCsv(z.enum(UFS)),
  modalidadeCodigo: listaOuCsv(z.string()),
  valorMinimo: z.coerce.number().nonnegative().optional(),
  valorMaximo: z.coerce.number().nonnegative().optional(),
  palavraChave: z.string().optional(),
  dataPublicacaoInicio: z.string().optional(),
  dataPublicacaoFim: z.string().optional(),
  /** Quando informado, ordena e pontua a listagem pelo matching desse cliente. */
  clienteId: z.string().optional(),
});
export type BuscarLicitacoesFiltro = z.infer<typeof buscarLicitacoesFiltroSchema>;

export const criarLicitacaoManualSchema = z.object({
  orgaoNome: z.string().min(2),
  orgaoCnpj: z.string().transform((v) => v.replace(/\D/g, "")),
  esfera: z.string().optional(),
  numeroProcesso: z.string().min(1),
  modalidadeCodigo: z.string().optional(),
  modalidadeNome: z.string().min(1),
  objeto: z.string().min(3),
  valorEstimado: z.number().nonnegative().nullable().optional(),
  uf: z.enum(UFS),
  municipio: z.string().optional(),
  dataPublicacao: z.string().optional(),
  dataSessaoAbertura: z.string().optional(),
  linkEdital: z.string().url().optional().or(z.literal("")),
});
export type CriarLicitacaoManualInput = z.infer<typeof criarLicitacaoManualSchema>;

export const sincronizarPncpSchema = z.object({
  uf: z.enum(UFS).optional(),
  modalidadeCodigo: z.string().min(1),
  dataInicial: z.string().min(8),
  dataFinal: z.string().min(8),
});
export type SincronizarPncpInput = z.infer<typeof sincronizarPncpSchema>;
