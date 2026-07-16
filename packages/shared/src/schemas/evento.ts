import { z } from "zod";

export const eventoResponseSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  descricao: z.string(),
  autorNome: z.string().nullable(),
  anexoUrl: z.string().nullable(),
  criadoEm: z.string(),
});
export type EventoResponse = z.infer<typeof eventoResponseSchema>;
