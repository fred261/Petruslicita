import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
  /** Preenchido apenas na segunda etapa, quando o usuário tem 2FA ativo. */
  codigoTotp: z.string().length(6).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("2FA_REQUIRED"),
    loginChallengeToken: z.string(),
  }),
  z.object({
    status: z.literal("OK"),
    accessToken: z.string(),
    refreshToken: z.string(),
    usuario: z.object({
      id: z.string(),
      nome: z.string(),
      email: z.string(),
      papel: z.enum(["MASTER", "ADMIN", "OPERADOR", "EMPRESA"]),
      totpEnabled: z.boolean(),
    }),
  }),
]);
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const senhaForteSchema = z
  .string()
  .min(10, "A senha deve ter ao menos 10 caracteres")
  .regex(/[a-z]/, "A senha deve ter ao menos uma letra minúscula")
  .regex(/[A-Z]/, "A senha deve ter ao menos uma letra maiúscula")
  .regex(/[0-9]/, "A senha deve ter ao menos um número")
  .regex(/[^a-zA-Z0-9]/, "A senha deve ter ao menos um caractere especial");

export const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: senhaForteSchema,
});
