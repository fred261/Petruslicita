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

/** Próximos status válidos a partir de cada status atual. */
export const TRANSICOES_PERMITIDAS: Record<StatusParticipacao, StatusParticipacao[]> = {
  SUGERIDA: ["EM_ANALISE", "DESCARTADA"],
  EM_ANALISE: ["EM_PREPARACAO", "DESCARTADA"],
  EM_PREPARACAO: ["ENVIADA", "DESCARTADA"],
  ENVIADA: ["EM_DISPUTA", "DESCARTADA"],
  EM_DISPUTA: ["HABILITACAO", "DESCARTADA"],
  HABILITACAO: ["RECURSAL", "VENCEDORA", "NAO_VENCEDORA", "DESCARTADA"],
  RECURSAL: ["VENCEDORA", "NAO_VENCEDORA", "DESCARTADA"],
  VENCEDORA: ["HOMOLOGADA"],
  NAO_VENCEDORA: [],
  HOMOLOGADA: ["CONTRATADA"],
  CONTRATADA: [],
  DESCARTADA: [],
};

/** Status a partir dos quais é obrigatório registrar o motivo de perda/descarte. */
export const STATUS_EXIGE_MOTIVO_PERDA: StatusParticipacao[] = ["DESCARTADA", "NAO_VENCEDORA"];

/** Status finais do pipeline — não admitem mais transição. */
export const STATUS_TERMINAIS: StatusParticipacao[] = ["DESCARTADA", "NAO_VENCEDORA", "CONTRATADA"];

export const MOTIVO_PERDA_CATEGORIAS = [
  "PRECO_SUPERIOR",
  "DESCLASSIFICACAO_TECNICA",
  "INABILITACAO_DOCUMENTAL",
  "DESISTENCIA_PROPRIA",
  "REVOGACAO_ANULACAO",
  "OUTRO",
] as const;
export type MotivoPerdaCategoria = (typeof MOTIVO_PERDA_CATEGORIAS)[number];

export const MOTIVO_PERDA_CATEGORIA_LABELS: Record<MotivoPerdaCategoria, string> = {
  PRECO_SUPERIOR: "Preço superior",
  DESCLASSIFICACAO_TECNICA: "Desclassificação técnica",
  INABILITACAO_DOCUMENTAL: "Inabilitação documental",
  DESISTENCIA_PROPRIA: "Desistência própria",
  REVOGACAO_ANULACAO: "Revogação/anulação do certame",
  OUTRO: "Outro",
};

/** Fases do funil do dashboard, agrupando os status internos (spec: "Funil do Dashboard"). */
export const FASE_FUNIL = ["CAPTACAO", "PREPARACAO", "EM_DISPUTA", "VENCIDAS_E_PERDIDAS", "FORA_DO_FUNIL"] as const;
export type FaseFunil = (typeof FASE_FUNIL)[number];

export const FASE_FUNIL_LABELS: Record<FaseFunil, string> = {
  CAPTACAO: "Captação",
  PREPARACAO: "Preparação",
  EM_DISPUTA: "Em disputa",
  VENCIDAS_E_PERDIDAS: "Vencidas e perdidas",
  FORA_DO_FUNIL: "Fora do funil",
};

export const FASE_FUNIL_POR_STATUS: Record<StatusParticipacao, FaseFunil> = {
  SUGERIDA: "CAPTACAO",
  EM_ANALISE: "PREPARACAO",
  EM_PREPARACAO: "PREPARACAO",
  ENVIADA: "PREPARACAO",
  EM_DISPUTA: "EM_DISPUTA",
  HABILITACAO: "EM_DISPUTA",
  RECURSAL: "EM_DISPUTA",
  VENCEDORA: "VENCIDAS_E_PERDIDAS",
  HOMOLOGADA: "VENCIDAS_E_PERDIDAS",
  CONTRATADA: "VENCIDAS_E_PERDIDAS",
  NAO_VENCEDORA: "VENCIDAS_E_PERDIDAS",
  DESCARTADA: "FORA_DO_FUNIL",
};
