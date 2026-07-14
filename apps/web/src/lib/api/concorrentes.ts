import type { ConcorrenteDetalhe, ConcorrenteResumo } from "@petrus/shared";
import { apiFetch } from "../api-client";

export function listarConcorrentes() {
  return apiFetch<ConcorrenteResumo[]>("/concorrentes");
}

export function buscarConcorrente(chave: string) {
  return apiFetch<ConcorrenteDetalhe>(`/concorrentes/${encodeURIComponent(chave)}`);
}
