import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api-client";
import {
  atualizarModeloDocumento,
  criarModeloDocumento,
  listarModelosDocumento,
} from "@/lib/api/documentos";

export function ModelosDocumentoPage() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [validadeDias, setValidadeDias] = useState("");

  const modelosQuery = useQuery({ queryKey: ["modelos-documento"], queryFn: listarModelosDocumento });

  const criarMutation = useMutation({
    mutationFn: () =>
      criarModeloDocumento({
        nome,
        categoria: categoria || undefined,
        validadeEmDiasPadrao: validadeDias ? Number(validadeDias) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelos-documento"] });
      setNome("");
      setCategoria("");
      setValidadeDias("");
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => atualizarModeloDocumento(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modelos-documento"] }),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Modelos de Documento</h1>
        <p className="text-sm text-ink-500">Tipos reutilizáveis para documentos recorrentes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo modelo</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              criarMutation.mutate();
            }}
          >
            <div className="sm:col-span-2">
              <Label htmlFor="modelo-nome">Nome</Label>
              <Input id="modelo-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="modelo-categoria">Categoria</Label>
              <Input id="modelo-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="modelo-validade">Validade padrão (dias)</Label>
              <Input
                id="modelo-validade"
                type="number"
                min={1}
                value={validadeDias}
                onChange={(e) => setValidadeDias(e.target.value)}
                placeholder="opcional"
              />
            </div>
            <div className="sm:col-span-3">
              {criarMutation.error && (
                <p className="mb-2 text-sm text-red-600">
                  {criarMutation.error instanceof ApiError ? criarMutation.error.message : "Erro ao criar modelo."}
                </p>
              )}
              <Button type="submit" size="sm" disabled={criarMutation.isPending}>
                {criarMutation.isPending ? "Salvando…" : "Adicionar modelo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-0">
          {(modelosQuery.data ?? []).map((modelo) => (
            <div
              key={modelo.id}
              className="flex items-center justify-between gap-2 border-b border-ink-100 px-5 py-3 text-sm last:border-0"
            >
              <div>
                <p className="text-ink-900">{modelo.nome}</p>
                <p className="text-xs text-ink-500">
                  {modelo.categoria ?? "Sem categoria"}
                  {modelo.validadeEmDiasPadrao ? ` · validade padrão: ${modelo.validadeEmDiasPadrao} dias` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={modelo.ativo ? "success" : "neutral"}>{modelo.ativo ? "Ativo" : "Inativo"}</Badge>
                <button
                  className="text-xs font-medium text-gold-600 hover:underline"
                  onClick={() => toggleAtivoMutation.mutate({ id: modelo.id, ativo: !modelo.ativo })}
                >
                  {modelo.ativo ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
          {(modelosQuery.data ?? []).length === 0 && (
            <p className="px-5 py-4 text-sm text-ink-500">Nenhum modelo cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
