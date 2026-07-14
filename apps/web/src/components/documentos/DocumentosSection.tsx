import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import { STATUS_DOCUMENTO_LABELS } from "@petrus/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api-client";
import {
  baixarDocumento,
  listarDocumentos,
  listarModelosDocumento,
  removerDocumento,
  uploadDocumento,
} from "@/lib/api/documentos";
import { useAuth } from "@/lib/auth-context";

interface DocumentosSectionProps {
  clienteId?: string;
  participacaoId?: string;
}

export function DocumentosSection({ clienteId, participacaoId }: DocumentosSectionProps) {
  const { user } = useAuth();
  const ehGestor = user?.papel === "MASTER" || user?.papel === "ADMIN";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataValidade, setDataValidade] = useState("");

  const filtro = { clienteId, participacaoId };
  const queryKey = ["documentos", clienteId ?? participacaoId];

  const documentosQuery = useQuery({ queryKey, queryFn: () => listarDocumentos(filtro) });
  const modelosQuery = useQuery({ queryKey: ["modelos-documento"], queryFn: listarModelosDocumento });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const arquivo = fileInputRef.current?.files?.[0];
      if (!arquivo) throw new Error("Selecione um arquivo.");
      return uploadDocumento({
        arquivo,
        tipo,
        dataEmissao: dataEmissao || undefined,
        dataValidade: dataValidade || undefined,
        clienteId,
        participacaoId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setTipo("");
      setDataEmissao("");
      setDataValidade("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const removerMutation = useMutation({
    mutationFn: removerDocumento,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleTipoChange = (novoTipo: string) => {
    setTipo(novoTipo);
    const modelo = modelosQuery.data?.find((m) => m.nome === novoTipo);
    if (modelo?.validadeEmDiasPadrao && dataEmissao) {
      const data = new Date(dataEmissao);
      data.setDate(data.getDate() + modelo.validadeEmDiasPadrao);
      setDataValidade(data.toISOString().slice(0, 10));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            uploadMutation.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <Label htmlFor="doc-arquivo">Arquivo</Label>
            <input
              id="doc-arquivo"
              ref={fileInputRef}
              type="file"
              className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <div>
            <Label htmlFor="doc-tipo">Tipo</Label>
            <Input
              id="doc-tipo"
              list="modelos-documento-lista"
              value={tipo}
              onChange={(e) => handleTipoChange(e.target.value)}
              placeholder="ex: Contrato Social, CND Federal…"
              required
            />
            <datalist id="modelos-documento-lista">
              {(modelosQuery.data ?? []).map((m) => (
                <option key={m.id} value={m.nome} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="doc-emissao">Emissão</Label>
              <Input id="doc-emissao" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="doc-validade">Validade</Label>
              <Input id="doc-validade" type="date" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} />
            </div>
          </div>

          {uploadMutation.error && (
            <p className="text-sm text-red-600 sm:col-span-2">
              {uploadMutation.error instanceof ApiError ? uploadMutation.error.message : "Erro ao enviar documento."}
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? "Enviando…" : "Enviar documento"}
            </Button>
          </div>
        </form>

        <div className="space-y-2 border-t border-ink-100 pt-3">
          {(documentosQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-500">Nenhum documento ainda.</p>
          ) : (
            documentosQuery.data!.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink-900">
                    {doc.tipo} — {doc.nomeArquivo}
                  </p>
                  <p className="text-xs text-ink-500">
                    {doc.dataValidade ? `Válido até ${new Date(doc.dataValidade).toLocaleDateString("pt-BR")}` : "Sem validade"}
                    {doc.uploadedByNome ? ` · ${doc.uploadedByNome}` : ""}
                  </p>
                </div>
                <Badge tone={doc.status === "VENCIDO" ? "danger" : doc.status === "VALIDO" ? "success" : "neutral"}>
                  {STATUS_DOCUMENTO_LABELS[doc.status]}
                </Badge>
                <button
                  className="text-ink-500 hover:text-gold-600"
                  title="Baixar"
                  onClick={() => baixarDocumento(doc.id, doc.nomeArquivo)}
                >
                  <Download className="h-4 w-4" />
                </button>
                {ehGestor && (
                  <button
                    className="text-ink-500 hover:text-red-600"
                    title="Remover"
                    onClick={() => removerMutation.mutate(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
