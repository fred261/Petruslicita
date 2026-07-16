export const STATUS_CONTRATO = ["ATIVO", "ENCERRADO", "RESCINDIDO"] as const;
export type StatusContrato = (typeof STATUS_CONTRATO)[number];

export const STATUS_CONTRATO_LABELS: Record<StatusContrato, string> = {
  ATIVO: "Ativo",
  ENCERRADO: "Encerrado",
  RESCINDIDO: "Rescindido",
};

export const TIPO_ITEM_CRONOGRAMA = ["ENTREGA", "FATURAMENTO"] as const;
export type TipoItemCronograma = (typeof TIPO_ITEM_CRONOGRAMA)[number];

export const TIPO_ITEM_CRONOGRAMA_LABELS: Record<TipoItemCronograma, string> = {
  ENTREGA: "Entrega",
  FATURAMENTO: "Faturamento",
};
