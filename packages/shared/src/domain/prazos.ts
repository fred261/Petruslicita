export const URGENCIA_PENDENCIA = ["ATRASADO", "VENCENDO", "PROXIMO", "SEM_PRAZO"] as const;
export type UrgenciaPendencia = (typeof URGENCIA_PENDENCIA)[number];

export const URGENCIA_PENDENCIA_LABELS: Record<UrgenciaPendencia, string> = {
  ATRASADO: "Atrasado",
  VENCENDO: "Vencendo",
  PROXIMO: "Próximo",
  SEM_PRAZO: "Sem prazo definido",
};
