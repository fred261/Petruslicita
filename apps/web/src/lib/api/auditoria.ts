import type {
  AccessLogResponse,
  AplicarRetencaoResponse,
  AuditLogResponse,
  FiltroAccessLogInput,
  FiltroAuditLogInput,
} from "@petrus/shared";
import { apiFetch } from "../api-client";

export function listarAuditLog(filtro: FiltroAuditLogInput) {
  const params = new URLSearchParams();
  if (filtro.entidade) params.set("entidade", filtro.entidade);
  if (filtro.usuarioId) params.set("usuarioId", filtro.usuarioId);
  if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
  if (filtro.limite) params.set("limite", String(filtro.limite));
  const query = params.toString();
  return apiFetch<AuditLogResponse[]>(`/auditoria/log${query ? `?${query}` : ""}`);
}

export function listarAccessLog(filtro: FiltroAccessLogInput) {
  const params = new URLSearchParams();
  if (filtro.usuarioId) params.set("usuarioId", filtro.usuarioId);
  if (filtro.sucesso !== undefined) params.set("sucesso", String(filtro.sucesso));
  if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
  if (filtro.limite) params.set("limite", String(filtro.limite));
  const query = params.toString();
  return apiFetch<AccessLogResponse[]>(`/auditoria/acessos${query ? `?${query}` : ""}`);
}

export function aplicarRetencao() {
  return apiFetch<AplicarRetencaoResponse>("/auditoria/aplicar-retencao", { method: "POST" });
}
