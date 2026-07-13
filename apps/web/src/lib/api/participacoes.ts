import type { CriarParticipacaoInput, ParticipacaoResponse } from "@petrus/shared";
import { apiFetch } from "../api-client";

export function criarParticipacao(input: CriarParticipacaoInput) {
  return apiFetch<ParticipacaoResponse>("/participacoes", { method: "POST", body: JSON.stringify(input) });
}

export function listarParticipacoesPorCliente(clienteId: string) {
  return apiFetch<ParticipacaoResponse[]>(`/participacoes?clienteId=${clienteId}`);
}

export function listarParticipacoesPorLicitacao(licitacaoId: string) {
  return apiFetch<ParticipacaoResponse[]>(`/participacoes/por-licitacao/${licitacaoId}`);
}
