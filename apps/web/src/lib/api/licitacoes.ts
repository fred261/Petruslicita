import type {
  BuscarLicitacoesFiltro,
  CriarLicitacaoManualInput,
  EventoResponse,
  ItemResponse,
  LicitacaoComItensResponse,
  LicitacaoResponse,
  SincronizarPncpInput,
} from "@petrus/shared";
import { apiFetch } from "../api-client";

export function listarLicitacoes(filtro: BuscarLicitacoesFiltro) {
  const params = new URLSearchParams();
  if (filtro.uf?.length) params.set("uf", filtro.uf.join(","));
  if (filtro.modalidadeCodigo?.length) params.set("modalidadeCodigo", filtro.modalidadeCodigo.join(","));
  if (filtro.valorMinimo !== undefined) params.set("valorMinimo", String(filtro.valorMinimo));
  if (filtro.valorMaximo !== undefined) params.set("valorMaximo", String(filtro.valorMaximo));
  if (filtro.palavraChave) params.set("palavraChave", filtro.palavraChave);
  if (filtro.dataPublicacaoInicio) params.set("dataPublicacaoInicio", filtro.dataPublicacaoInicio);
  if (filtro.dataPublicacaoFim) params.set("dataPublicacaoFim", filtro.dataPublicacaoFim);
  if (filtro.clienteId) params.set("clienteId", filtro.clienteId);

  const query = params.toString();
  return apiFetch<LicitacaoResponse[]>(`/licitacoes${query ? `?${query}` : ""}`);
}

export function buscarLicitacao(id: string) {
  return apiFetch<LicitacaoComItensResponse>(`/licitacoes/${id}`);
}

export function criarLicitacaoManual(input: CriarLicitacaoManualInput) {
  return apiFetch<LicitacaoResponse>("/licitacoes", { method: "POST", body: JSON.stringify(input) });
}

export function atualizarItensLicitacao(id: string) {
  return apiFetch<LicitacaoComItensResponse>(`/licitacoes/${id}/atualizar-itens`, { method: "POST" });
}

export function adicionarItemManual(
  id: string,
  item: { numero: number; descricao: string; unidadeMedida?: string; quantidade: number },
) {
  return apiFetch<ItemResponse>(`/licitacoes/${id}/itens`, { method: "POST", body: JSON.stringify(item) });
}

export function listarEventosLicitacao(id: string) {
  return apiFetch<EventoResponse[]>(`/licitacoes/${id}/eventos`);
}

export function sincronizarPncp(input: SincronizarPncpInput) {
  return apiFetch<{ encontradas: number; criadas: number; atualizadas: number }>(
    "/licitacoes/sincronizar-pncp",
    { method: "POST", body: JSON.stringify(input) },
  );
}
