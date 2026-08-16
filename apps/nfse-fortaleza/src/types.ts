/**
 * SQLite (via Prisma) não suporta enum nativo, então `modo`/`status` da
 * NotaFiscal são colunas String no banco. Estes tipos são a única fonte de
 * verdade dos valores válidos usados pelo código da aplicação — mantenha em
 * sincronia com os comentários em prisma/schema.prisma.
 */

export type ModoEmissao = "SEMI_AUTOMATICO" | "AUTOMATICO";

export type StatusNota = "RASCUNHO" | "AGUARDANDO_REVISAO" | "EMITINDO" | "EMITIDA" | "FALHOU";
