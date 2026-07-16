import type {
  AtualizarPrazoParticipacaoInput,
  AtualizarStatusParticipacaoInput,
  AtualizarValorPropostoInput,
  ComentarioResponse,
  CriarComentarioInput,
  CriarParticipacaoInput,
  EventoResponse,
  ParticipacaoResponse,
  SelecionarItensParticipacaoInput,
} from "@petrus/shared";
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

export function buscarParticipacao(id: string) {
  return apiFetch<ParticipacaoResponse>(`/participacoes/${id}`);
}

export function atualizarStatusParticipacao(id: string, input: AtualizarStatusParticipacaoInput) {
  return apiFetch<ParticipacaoResponse>(`/participacoes/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function atualizarPrazoParticipacao(id: string, input: AtualizarPrazoParticipacaoInput) {
  return apiFetch<ParticipacaoResponse>(`/participacoes/${id}/prazo`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function atualizarValorPropostoParticipacao(id: string, input: AtualizarValorPropostoInput) {
  return apiFetch<ParticipacaoResponse>(`/participacoes/${id}/valor-proposto`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function selecionarItensParticipacao(id: string, input: SelecionarItensParticipacaoInput) {
  return apiFetch<ParticipacaoResponse>(`/participacoes/${id}/itens`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function listarEventosParticipacao(id: string) {
  return apiFetch<EventoResponse[]>(`/participacoes/${id}/eventos`);
}

export function listarComentariosParticipacao(id: string) {
  return apiFetch<ComentarioResponse[]>(`/participacoes/${id}/comentarios`);
}

export function comentarParticipacao(id: string, input: CriarComentarioInput) {
  return apiFetch<ComentarioResponse>(`/participacoes/${id}/comentarios`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
