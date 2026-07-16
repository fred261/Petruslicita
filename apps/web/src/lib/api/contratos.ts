import type {
  AtualizarContratoInput,
  ContratoResponse,
  CriarContratoInput,
  CriarItemCronogramaInput,
  ItemCronogramaResponse,
} from "@petrus/shared";
import { apiFetch } from "../api-client";

export function buscarContrato(participacaoId: string) {
  return apiFetch<ContratoResponse | null>(`/participacoes/${participacaoId}/contrato`);
}

export function criarContrato(participacaoId: string, input: CriarContratoInput) {
  return apiFetch<ContratoResponse>(`/participacoes/${participacaoId}/contrato`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function atualizarContrato(id: string, input: AtualizarContratoInput) {
  return apiFetch<ContratoResponse>(`/contratos/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function adicionarItemCronograma(contratoId: string, input: CriarItemCronogramaInput) {
  return apiFetch<ItemCronogramaResponse>(`/contratos/${contratoId}/cronograma`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function marcarItemCronogramaConcluido(itemId: string, concluido: boolean) {
  return apiFetch<ItemCronogramaResponse>(`/contratos/cronograma/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ concluido }),
  });
}
