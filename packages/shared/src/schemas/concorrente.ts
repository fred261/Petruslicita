import { z } from "zod";

export const concorrenteResumoSchema = z.object({
  chave: z.string(),
  nome: z.string(),
  cnpj: z.string().nullable(),
  totalDisputas: z.number(),
  clientesAfetados: z.number(),
  valorMedioPercentualDiferenca: z.number().nullable(),
  ultimaDisputaEm: z.string().nullable(),
});
export type ConcorrenteResumo = z.infer<typeof concorrenteResumoSchema>;

export const disputaConcorrenteSchema = z.object({
  participacaoId: z.string(),
  clienteId: z.string(),
  clienteRazaoSocial: z.string(),
  licitacaoId: z.string(),
  licitacaoNumeroProcesso: z.string(),
  licitacaoOrgaoNome: z.string(),
  licitacaoObjeto: z.string(),
  licitacaoModalidadeNome: z.string(),
  valorProposto: z.number().nullable(),
  valorPropostaVencedora: z.number().nullable(),
  diferencaPercentual: z.number().nullable(),
  dataDecisao: z.string().nullable(),
});
export type DisputaConcorrente = z.infer<typeof disputaConcorrenteSchema>;

export const concorrenteDetalheSchema = z.object({
  chave: z.string(),
  nome: z.string(),
  cnpj: z.string().nullable(),
  totalDisputas: z.number(),
  valorMedioPercentualDiferenca: z.number().nullable(),
  valorTotalPropostasVencedoras: z.number(),
  disputas: z.array(disputaConcorrenteSchema),
});
export type ConcorrenteDetalhe = z.infer<typeof concorrenteDetalheSchema>;
