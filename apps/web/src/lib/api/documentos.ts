import type {
  AtualizarModeloDocumentoInput,
  CriarModeloDocumentoInput,
  DocumentoResponse,
  ModeloDocumentoResponse,
} from "@petrus/shared";
import { apiDownloadBlob, apiFetch, apiUpload } from "../api-client";

export interface UploadDocumentoInput {
  arquivo: File;
  tipo: string;
  dataEmissao?: string;
  dataValidade?: string;
  clienteId?: string;
  participacaoId?: string;
}

export function uploadDocumento(input: UploadDocumentoInput) {
  const formData = new FormData();
  formData.append("arquivo", input.arquivo);
  formData.append("tipo", input.tipo);
  if (input.dataEmissao) formData.append("dataEmissao", input.dataEmissao);
  if (input.dataValidade) formData.append("dataValidade", input.dataValidade);
  if (input.clienteId) formData.append("clienteId", input.clienteId);
  if (input.participacaoId) formData.append("participacaoId", input.participacaoId);
  return apiUpload<DocumentoResponse>("/documentos", formData);
}

export function listarDocumentos(filtro: { clienteId?: string; participacaoId?: string }) {
  const params = new URLSearchParams();
  if (filtro.clienteId) params.set("clienteId", filtro.clienteId);
  if (filtro.participacaoId) params.set("participacaoId", filtro.participacaoId);
  return apiFetch<DocumentoResponse[]>(`/documentos?${params.toString()}`);
}

export async function baixarDocumento(id: string, nomeArquivo: string) {
  const blob = await apiDownloadBlob(`/documentos/${id}/download`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function removerDocumento(id: string) {
  return apiFetch<{ ok: true }>(`/documentos/${id}`, { method: "DELETE" });
}

export function listarModelosDocumento() {
  return apiFetch<ModeloDocumentoResponse[]>("/modelos-documento");
}

export function criarModeloDocumento(input: CriarModeloDocumentoInput) {
  return apiFetch<ModeloDocumentoResponse>("/modelos-documento", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function atualizarModeloDocumento(id: string, input: AtualizarModeloDocumentoInput) {
  return apiFetch<ModeloDocumentoResponse>(`/modelos-documento/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
