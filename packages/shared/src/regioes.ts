/**
 * A API do PNCP não expõe "região" — o mapeamento UF -> Região é estático
 * e mantido aqui para ser reutilizado por captação de editais, filtros de
 * cliente (UFs/regiões de interesse) e relatórios.
 */
export const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"] as const;
export type Regiao = (typeof REGIOES)[number];

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;
export type Uf = (typeof UFS)[number];

export const UF_TO_REGIAO: Record<Uf, Regiao> = {
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

export function regiaoDaUf(uf: Uf): Regiao {
  return UF_TO_REGIAO[uf];
}
