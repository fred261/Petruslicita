import type {
  AtualizarClienteCamadaEditavelInput,
  ClienteResponse,
  CriarClienteInput,
} from "@petrus/shared";
import { apiFetch } from "../api-client";

export function listarClientes() {
  return apiFetch<ClienteResponse[]>("/clientes");
}

export function buscarCliente(id: string) {
  return apiFetch<ClienteResponse>(`/clientes/${id}`);
}

export function criarCliente(input: CriarClienteInput) {
  return apiFetch<ClienteResponse>("/clientes", { method: "POST", body: JSON.stringify(input) });
}

export function atualizarDadosApiCliente(id: string) {
  return apiFetch<ClienteResponse>(`/clientes/${id}/atualizar-dados`, { method: "POST" });
}

export function atualizarCamadaEditavelCliente(
  id: string,
  input: AtualizarClienteCamadaEditavelInput,
) {
  return apiFetch<ClienteResponse>(`/clientes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
