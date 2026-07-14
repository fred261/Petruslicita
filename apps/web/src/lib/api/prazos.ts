import type { ConfiguracaoSistemaInput, ConfiguracaoSistemaResponse, PendenciaResponse } from "@petrus/shared";
import { apiFetch } from "../api-client";

export function listarPendencias() {
  return apiFetch<PendenciaResponse[]>("/prazos/pendencias");
}

export function executarVerificacaoAgora() {
  return apiFetch<{
    participacoesAvaliadas: number;
    cobrancasEnviadas: number;
    escalonamentosEnviados: number;
    alertasDocumentosEnviados: number;
  }>("/prazos/executar-agora", { method: "POST" });
}

export function obterConfiguracaoSistema() {
  return apiFetch<ConfiguracaoSistemaResponse>("/prazos/configuracao");
}

export function atualizarConfiguracaoSistema(input: ConfiguracaoSistemaInput) {
  return apiFetch<ConfiguracaoSistemaResponse>("/prazos/configuracao", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
