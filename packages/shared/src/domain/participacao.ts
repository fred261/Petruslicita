/** Fluxo de status da Participação (spec: "Fluxo de Status da Participação"). */
export const STATUS_PARTICIPACAO = [
  "SUGERIDA",
  "EM_ANALISE",
  "DESCARTADA",
  "EM_PREPARACAO",
  "ENVIADA",
  "EM_DISPUTA",
  "HABILITACAO",
  "RECURSAL",
  "VENCEDORA",
  "NAO_VENCEDORA",
  "HOMOLOGADA",
  "CONTRATADA",
] as const;
export type StatusParticipacao = (typeof STATUS_PARTICIPACAO)[number];

export const STATUS_PARTICIPACAO_LABELS: Record<StatusParticipacao, string> = {
  SUGERIDA: "Sugerida",
  EM_ANALISE: "Em análise",
  DESCARTADA: "Descartada",
  EM_PREPARACAO: "Em preparação",
  ENVIADA: "Enviada/Protocolada",
  EM_DISPUTA: "Em disputa",
  HABILITACAO: "Habilitação",
  RECURSAL: "Recursal",
  VENCEDORA: "Vencedora",
  NAO_VENCEDORA: "Não vencedora",
  HOMOLOGADA: "Homologada/Adjudicada",
  CONTRATADA: "Contratada",
};

export const ORIGEM_PARTICIPACAO = ["SUGESTAO_MATCHING", "MANUAL"] as const;
export type OrigemParticipacao = (typeof ORIGEM_PARTICIPACAO)[number];
