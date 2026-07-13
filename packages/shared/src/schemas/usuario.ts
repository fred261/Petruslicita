import { z } from "zod";
import { senhaForteSchema } from "./auth";

export const criarUsuarioSchema = z.object({
  nome: z.string().min(2, "Informe o nome completo"),
  email: z.string().email("E-mail inválido"),
  papel: z.enum(["MASTER", "ADMIN", "OPERADOR", "EMPRESA"]),
  senha: senhaForteSchema,
  /** Obrigatório quando papel é OPERADOR ou EMPRESA. */
  clienteIds: z.array(z.string()).optional().default([]),
});
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;

export const atualizarUsuarioSchema = z.object({
  nome: z.string().min(2).optional(),
  papel: z.enum(["MASTER", "ADMIN", "OPERADOR", "EMPRESA"]).optional(),
  ativo: z.boolean().optional(),
  clienteIds: z.array(z.string()).optional(),
});
export type AtualizarUsuarioInput = z.infer<typeof atualizarUsuarioSchema>;

export const usuarioResponseSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  papel: z.enum(["MASTER", "ADMIN", "OPERADOR", "EMPRESA"]),
  ativo: z.boolean(),
  totpEnabled: z.boolean(),
  clienteIds: z.array(z.string()),
  criadoEm: z.string(),
  ultimoAcessoEm: z.string().nullable(),
});
export type UsuarioResponse = z.infer<typeof usuarioResponseSchema>;
