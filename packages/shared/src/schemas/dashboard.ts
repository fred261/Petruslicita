import { z } from "zod";
import { FASE_FUNIL, STATUS_PARTICIPACAO } from "../domain/participacao";

export const filtroDashboardSchema = z.object({
  clienteId: z.string().optional(),
  responsavelId: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
});
export type FiltroDashboardInput = z.infer<typeof filtroDashboardSchema>;

export const funilFaseSchema = z.object({
  fase: z.enum(FASE_FUNIL),
  total: z.number(),
  porStatus: z.record(z.enum(STATUS_PARTICIPACAO), z.number()),
});

export const funilResponseSchema = z.object({
  totalGeral: z.number(),
  fases: z.array(funilFaseSchema),
  taxaSucesso: z.number().nullable(),
});
export type FunilResponse = z.infer<typeof funilResponseSchema>;

export const indicadoresClienteResponseSchema = z.object({
  clienteId: z.string(),
  clienteRazaoSocial: z.string(),
  totalParticipacoes: z.number(),
  participacoesAtivas: z.number(),
  vencidas: z.number(),
  naoVencidas: z.number(),
  descartadas: z.number(),
  taxaSucesso: z.number().nullable(),
  valorTotalProposto: z.number(),
  valorTotalContratado: z.number(),
  contratosAtivos: z.number(),
});
export type IndicadoresClienteResponse = z.infer<typeof indicadoresClienteResponseSchema>;

export const rankingClienteSchema = z.object({
  clienteId: z.string(),
  clienteRazaoSocial: z.string(),
  totalParticipacoes: z.number(),
  valorTotalContratado: z.number(),
  taxaSucesso: z.number().nullable(),
});

export const consolidadoResponseSchema = z.object({
  totalClientes: z.number(),
  totalParticipacoes: z.number(),
  participacoesAtivas: z.number(),
  taxaSucesso: z.number().nullable(),
  valorTotalContratado: z.number(),
  contratosAtivos: z.number(),
  funil: funilResponseSchema,
  rankingClientes: z.array(rankingClienteSchema),
});
export type ConsolidadoResponse = z.infer<typeof consolidadoResponseSchema>;

export const EXPORTAR_TIPOS = ["FUNIL", "INDICADORES_CLIENTE", "CONSOLIDADO"] as const;
export type ExportarTipo = (typeof EXPORTAR_TIPOS)[number];

export const EXPORTAR_FORMATOS = ["PDF", "XLSX"] as const;
export type ExportarFormato = (typeof EXPORTAR_FORMATOS)[number];

export const exportarRelatorioSchema = z.object({
  tipo: z.enum(EXPORTAR_TIPOS),
  formato: z.enum(EXPORTAR_FORMATOS),
  clienteId: z.string().optional(),
  responsavelId: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
});
export type ExportarRelatorioInput = z.infer<typeof exportarRelatorioSchema>;
