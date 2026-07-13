import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { STATUS_PARTICIPACAO_LABELS } from "@petrus/shared";
import {
  atualizarClienteCamadaEditavelSchema,
  UFS,
  type AtualizarClienteCamadaEditavelInput,
} from "@petrus/shared";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api-client";
import { atualizarCamadaEditavelCliente, atualizarDadosApiCliente, buscarCliente } from "@/lib/api/clientes";
import { listarParticipacoesPorCliente } from "@/lib/api/participacoes";
import { listarUsuarios } from "@/lib/api/usuarios";
import { useAuth } from "@/lib/auth-context";
import { numberWithDefault, optionalNumber } from "@/lib/form-utils";

export function ClienteFichaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const ehGestor = user?.papel === "MASTER" || user?.papel === "ADMIN";
  const queryClient = useQueryClient();

  const clienteQuery = useQuery({
    queryKey: ["clientes", id],
    queryFn: () => buscarCliente(id!),
    enabled: !!id,
  });

  const participacoesQuery = useQuery({
    queryKey: ["participacoes", "por-cliente", id],
    queryFn: () => listarParticipacoesPorCliente(id!),
    enabled: !!id,
  });

  const operadoresQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: listarUsuarios,
    enabled: ehGestor,
  });

  const form = useForm<AtualizarClienteCamadaEditavelInput>({
    resolver: zodResolver(atualizarClienteCamadaEditavelSchema),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "palavrasChave" });

  useEffect(() => {
    if (clienteQuery.data) {
      form.reset({
        palavrasChave: clienteQuery.data.palavrasChave,
        ufsInteresse: clienteQuery.data.ufsInteresse,
        valorMinimoInteresse: clienteQuery.data.valorMinimoInteresse,
        valorMaximoInteresse: clienteQuery.data.valorMaximoInteresse,
        responsavelId: clienteQuery.data.responsavelId,
        status: clienteQuery.data.status,
      });
    }
  }, [clienteQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const atualizarDadosMutation = useMutation({
    mutationFn: () => atualizarDadosApiCliente(id!),
    onSuccess: (data) => queryClient.setQueryData(["clientes", id], data),
  });

  const salvarMutation = useMutation({
    mutationFn: (input: AtualizarClienteCamadaEditavelInput) =>
      atualizarCamadaEditavelCliente(id!, input),
    onSuccess: (data) => queryClient.setQueryData(["clientes", id], data),
  });

  if (clienteQuery.isLoading) return <p className="text-sm text-ink-500">Carregando…</p>;
  if (!clienteQuery.data) return <p className="text-sm text-red-600">Cliente não encontrado.</p>;
  const cliente = clienteQuery.data;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{cliente.razaoSocial}</h1>
          <p className="text-sm text-ink-500">{formatCnpj(cliente.cnpj)}</p>
        </div>
        <Badge tone={cliente.status === "ATIVO" ? "success" : "danger"}>
          {cliente.status === "ATIVO" ? "Ativo" : "Inativo"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Participações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(participacoesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-500">Nenhuma participação ainda.</p>
          ) : (
            participacoesQuery.data!.map((p) => (
              <Link
                key={p.id}
                to={`/participacoes/${p.id}`}
                className="flex items-center justify-between gap-2 text-sm hover:underline"
              >
                <span className="min-w-0 flex-1 truncate text-ink-900">{p.licitacaoOrgaoNome}</span>
                <Badge tone="gold">{STATUS_PARTICIPACAO_LABELS[p.status]}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Dados cadastrais (via CNPJ)</CardTitle>
          {ehGestor && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => atualizarDadosMutation.mutate()}
              disabled={atualizarDadosMutation.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {atualizarDadosMutation.isPending ? "Atualizando…" : "Atualizar dados"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome fantasia" valor={cliente.nomeFantasia ?? "—"} />
          <Campo label="Situação cadastral" valor={cliente.situacaoCadastral} />
          <Campo label="CNAE principal" valor={`${cliente.cnaePrincipalCodigo} — ${cliente.cnaePrincipalDescricao}`} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <Label>CNAEs secundários</Label>
            {cliente.cnaesSecundarios.length === 0 ? (
              <p className="text-sm text-ink-500">Nenhum</p>
            ) : (
              <ul className="list-inside list-disc text-sm text-ink-700">
                {cliente.cnaesSecundarios.map((c) => (
                  <li key={c.codigo}>
                    {c.codigo} — {c.descricao}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Campo
            label="Endereço"
            valor={[
              cliente.endereco.logradouro,
              cliente.endereco.numero,
              cliente.endereco.bairro,
              cliente.endereco.municipio,
              cliente.endereco.uf,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
            className="sm:col-span-2"
          />
          <Campo
            label="Dados atualizados em"
            valor={new Date(cliente.dadosApiAtualizadosEm).toLocaleString("pt-BR")}
            className="sm:col-span-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfil de matching (editável)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={form.handleSubmit((data) => salvarMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <Label>Palavras-chave de interesse</Label>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Termo"
                      className="flex-1"
                      {...form.register(`palavrasChave.${index}.termo` as const)}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      className="w-20"
                      {...form.register(`palavrasChave.${index}.peso` as const, {
                        setValueAs: numberWithDefault(1),
                      })}
                    />
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => remove(index)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs font-medium text-gold-600 hover:underline"
                  onClick={() => append({ termo: "", peso: 1 })}
                >
                  + Adicionar palavra-chave
                </button>
              </div>
            </div>

            <div>
              <Label>UFs de interesse</Label>
              <div className="grid max-h-40 grid-cols-6 gap-2 overflow-y-auto rounded-md border border-ink-100 p-3 sm:grid-cols-9">
                {UFS.map((uf) => (
                  <label key={uf} className="flex items-center gap-1 text-xs text-ink-700">
                    <input type="checkbox" value={uf} {...form.register("ufsInteresse")} />
                    {uf}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valorMinimoInteresse">Valor mínimo de interesse (R$)</Label>
                <Input
                  id="valorMinimoInteresse"
                  type="number"
                  step="0.01"
                  {...form.register("valorMinimoInteresse", { setValueAs: optionalNumber })}
                />
              </div>
              <div>
                <Label htmlFor="valorMaximoInteresse">Valor máximo de interesse (R$)</Label>
                <Input
                  id="valorMaximoInteresse"
                  type="number"
                  step="0.01"
                  {...form.register("valorMaximoInteresse", { setValueAs: optionalNumber })}
                />
              </div>
            </div>

            {ehGestor && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="responsavelId">Responsável interno</Label>
                  <select
                    id="responsavelId"
                    className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
                    {...form.register("responsavelId")}
                  >
                    <option value="">Não definido</option>
                    {(operadoresQuery.data ?? []).map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
                    {...form.register("status")}
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>
              </div>
            )}

            {salvarMutation.error && (
              <p className="text-sm text-red-600">
                {salvarMutation.error instanceof ApiError
                  ? salvarMutation.error.message
                  : "Erro ao salvar alterações."}
              </p>
            )}

            <Button type="submit" disabled={salvarMutation.isPending}>
              {salvarMutation.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({ label, valor, className }: { label: string; valor: string; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <p className="text-sm text-ink-900">{valor}</p>
    </div>
  );
}

function formatCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
