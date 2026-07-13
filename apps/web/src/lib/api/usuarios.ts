import type { AtualizarUsuarioInput, CriarUsuarioInput, UsuarioResponse } from "@petrus/shared";
import { apiFetch } from "../api-client";

export function listarUsuarios() {
  return apiFetch<UsuarioResponse[]>("/usuarios");
}

export function criarUsuario(input: CriarUsuarioInput) {
  return apiFetch<UsuarioResponse>("/usuarios", { method: "POST", body: JSON.stringify(input) });
}

export function atualizarUsuario(id: string, input: AtualizarUsuarioInput) {
  return apiFetch<UsuarioResponse>(`/usuarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function redefinirSenhaUsuario(id: string, novaSenha: string) {
  return apiFetch<{ ok: true }>(`/usuarios/${id}/redefinir-senha`, {
    method: "POST",
    body: JSON.stringify({ novaSenha }),
  });
}

export function excluirUsuario(id: string) {
  return apiFetch<{ ok: true }>(`/usuarios/${id}`, { method: "DELETE" });
}
