/**
 * Modalidades de contratação conforme domínio do PNCP (Lei nº 14.133/2021,
 * art. 28). Mantido como tabela estática — a API do PNCP usa esses códigos
 * como filtro (`codigoModalidadeContratacao`).
 */
export const MODALIDADES_PNCP = [
  { codigo: "1", nome: "Leilão - Eletrônico" },
  { codigo: "2", nome: "Diálogo Competitivo" },
  { codigo: "3", nome: "Concurso" },
  { codigo: "4", nome: "Concorrência - Eletrônica" },
  { codigo: "5", nome: "Concorrência - Presencial" },
  { codigo: "6", nome: "Pregão - Eletrônico" },
  { codigo: "7", nome: "Pregão - Presencial" },
  { codigo: "8", nome: "Dispensa de Licitação" },
  { codigo: "9", nome: "Inexigibilidade" },
  { codigo: "10", nome: "Manifestação de Interesse" },
  { codigo: "11", nome: "Pré-qualificação" },
  { codigo: "12", nome: "Credenciamento" },
  { codigo: "13", nome: "Leilão - Presencial" },
] as const;

export type ModalidadeCodigo = (typeof MODALIDADES_PNCP)[number]["codigo"];

export function nomeModalidade(codigo: string): string {
  return MODALIDADES_PNCP.find((m) => m.codigo === codigo)?.nome ?? codigo;
}
