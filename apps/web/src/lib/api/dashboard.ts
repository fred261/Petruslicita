import type {
  ConsolidadoResponse,
  ExportarRelatorioInput,
  FiltroDashboardInput,
  FunilResponse,
  IndicadoresClienteResponse,
} from "@petrus/shared";
import { apiDownloadBlob, apiFetch } from "../api-client";

function paramsDeFiltro(filtro: FiltroDashboardInput): string {
  const params = new URLSearchParams();
  if (filtro.clienteId) params.set("clienteId", filtro.clienteId);
  if (filtro.responsavelId) params.set("responsavelId", filtro.responsavelId);
  if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
  return params.toString();
}

export function buscarFunil(filtro: FiltroDashboardInput) {
  const query = paramsDeFiltro(filtro);
  return apiFetch<FunilResponse>(`/dashboard/funil${query ? `?${query}` : ""}`);
}

export function buscarIndicadoresCliente(clienteId: string) {
  return apiFetch<IndicadoresClienteResponse>(`/dashboard/indicadores-cliente/${clienteId}`);
}

export function buscarConsolidado(filtro: FiltroDashboardInput) {
  const query = paramsDeFiltro(filtro);
  return apiFetch<ConsolidadoResponse>(`/dashboard/consolidado${query ? `?${query}` : ""}`);
}

export async function exportarRelatorio(input: ExportarRelatorioInput) {
  const params = new URLSearchParams();
  params.set("tipo", input.tipo);
  params.set("formato", input.formato);
  if (input.clienteId) params.set("clienteId", input.clienteId);
  if (input.responsavelId) params.set("responsavelId", input.responsavelId);
  if (input.dataInicio) params.set("dataInicio", input.dataInicio);
  if (input.dataFim) params.set("dataFim", input.dataFim);

  const blob = await apiDownloadBlob(`/dashboard/exportar?${params.toString()}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${input.tipo.toLowerCase()}.${input.formato.toLowerCase()}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
