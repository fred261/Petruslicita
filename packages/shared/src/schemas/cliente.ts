import { z } from "zod";
import { UFS } from "../regioes";

export const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 14, "CNPJ deve ter 14 dígitos");

/** Bloco travado — vem 100% da consulta de CNPJ, nunca editado à mão. */
export const clienteDadosApiSchema = z.object({
  cnpj: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
  cnaePrincipalCodigo: z.string(),
  cnaePrincipalDescricao: z.string(),
  cnaesSecundarios: z.array(
    z.object({ codigo: z.string(), descricao: z.string() }),
  ),
  situacaoCadastral: z.string(),
  endereco: z.object({
    logradouro: z.string().nullable(),
    numero: z.string().nullable(),
    complemento: z.string().nullable(),
    bairro: z.string().nullable(),
    municipio: z.string().nullable(),
    uf: z.string().nullable(),
    cep: z.string().nullable(),
  }),
});
export type ClienteDadosApi = z.infer<typeof clienteDadosApiSchema>;

/** Bloco editável — camada complementar de matching, preenchida pelo escritório. */
export const clienteCamadaEditavelSchema = z.object({
  palavrasChave: z
    .array(z.object({ termo: z.string().min(1), peso: z.number().min(1).max(5).default(1) }))
    .default([]),
  ufsInteresse: z.array(z.enum(UFS)).default([]),
  valorMinimoInteresse: z.number().nonnegative().nullable().default(null),
  valorMaximoInteresse: z.number().nonnegative().nullable().default(null),
  responsavelId: z.string().nullable().default(null),
  status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
});
export type ClienteCamadaEditavel = z.infer<typeof clienteCamadaEditavelSchema>;

export const criarClienteSchema = z.object({
  cnpj: cnpjSchema,
}).merge(clienteCamadaEditavelSchema.partial());
export type CriarClienteInput = z.infer<typeof criarClienteSchema>;

export const atualizarClienteCamadaEditavelSchema = clienteCamadaEditavelSchema.partial();
export type AtualizarClienteCamadaEditavelInput = z.infer<
  typeof atualizarClienteCamadaEditavelSchema
>;

export const clienteResponseSchema = clienteDadosApiSchema
  .merge(clienteCamadaEditavelSchema)
  .extend({
    id: z.string(),
    dadosApiAtualizadosEm: z.string(),
    criadoEm: z.string(),
  });
export type ClienteResponse = z.infer<typeof clienteResponseSchema>;
