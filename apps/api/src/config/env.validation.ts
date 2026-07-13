import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  TOTP_ISSUER: z.string().default("Petrus Licitação"),
  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
  CNPJ_LOOKUP_PRIMARY_URL: z.string().url().default("https://brasilapi.com.br/api/cnpj/v1"),
  CNPJ_LOOKUP_FALLBACK_URL: z.string().url().default("https://publica.cnpj.ws/cnpj"),
  PNCP_BASE_URL: z.string().url().default("https://pncp.gov.br/api/consulta"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  WEB_URL: z.string().default("http://localhost:5173"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Configuração de ambiente inválida:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }
  return parsed.data;
}
