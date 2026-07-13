import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { STATUS_PARTICIPACAO_LABELS } from "@petrus/shared";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api-client";
import {
  adicionarItemManual,
  atualizarItensLicitacao,
  buscarLicitacao,
  listarEventosLicitacao,
} from "@/lib/api/licitacoes";
import { listarParticipacoesPorLicitacao } from "@/lib/api/participacoes";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/Input";

export function EditalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const ehGestor = user?.papel === "MASTER" || user?.papel === "ADMIN";
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);

  const licitacaoQuery = useQuery({
    queryKey: ["licitacoes", id],
    queryFn: () => buscarLicitacao(id!),
    enabled: !!id,
  });

  const eventosQuery = useQuery({
    queryKey: ["licitacoes", id, "eventos"],
    queryFn: () => listarEventosLicitacao(id!),
    enabled: !!id,
  });

  const participacoesQuery = useQuery({
    queryKey: ["participacoes", "por-licitacao", id],
    queryFn: () => listarParticipacoesPorLicitacao(id!),
    enabled: !!id && ehGestor,
  });

  const atualizarItensMutation = useMutation({
    mutationFn: () => atualizarItensLicitacao(id!),
    onSuccess: (data) => {
      queryClient.setQueryData(["licitacoes", id], data);
      queryClient.invalidateQueries({ queryKey: ["licitacoes", id, "eventos"] });
      setErro(null);
    },
    onError: (err) => setErro(err instanceof ApiError ? err.message : "Erro ao atualizar itens."),
  });

  if (licitacaoQuery.isLoading) return <p className="text-sm text-ink-500">Carregando…</p>;
  if (!licitacaoQuery.data) return <p className="text-sm text-red-600">Licitação não encontrada.</p>;
  const licitacao = licitacaoQuery.data;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone={licitacao.fonte === "PNCP" ? "gold" : "neutral"}>{licitacao.fonte}</Badge>
            {licitacao.situacao && <Badge tone="neutral">{licitacao.situacao}</Badge>}
          </div>
          <h1 className="text-xl font-semibold text-ink-900">{licitacao.orgaoNome}</h1>
          <p className="text-sm text-ink-500">
            Processo {licitacao.numeroProcesso} · {licitacao.modalidadeNome}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do edital</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Campo label="Objeto" valor={licitacao.objeto} className="sm:col-span-2" />
          <Campo
            label="Valor estimado"
            valor={
              licitacao.valorEstimado !== null
                ? licitacao.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : "—"
            }
          />
          <Campo label="UF / Município" valor={[licitacao.uf, licitacao.municipio].filter(Boolean).join(" · ")} />
          <Campo label="Publicação" valor={formatData(licitacao.dataPublicacao)} />
          <Campo label="Sessão de abertura" valor={formatData(licitacao.dataSessaoAbertura)} />
          {licitacao.linkEdital && (
            <div className="sm:col-span-2">
              <Label>Link do edital</Label>
              <a
                href={licitacao.linkEdital}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-gold-600 hover:underline"
              >
                {licitacao.linkEdital}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Itens / Lotes</CardTitle>
          {licitacao.fonte === "PNCP" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => atualizarItensMutation.mutate()}
              disabled={atualizarItensMutation.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {atualizarItensMutation.isPending ? "Atualizando…" : "Atualizar itens"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {erro && <p className="p-4 text-sm text-red-600">{erro}</p>}
          {licitacao.itens.length === 0 ? (
            <p className="p-4 text-sm text-ink-500">
              {licitacao.itensCaptadosEm
                ? "Nenhum item retornado pelo portal."
                : licitacao.fonte === "PNCP"
                  ? "Itens ainda não captados — serão buscados automaticamente quando uma Participação for criada."
                  : "Nenhum item cadastrado ainda para este edital manual."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Descrição</th>
                  <th className="px-4 py-2">Qtd.</th>
                  <th className="px-4 py-2">Valor unit.</th>
                  <th className="px-4 py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {licitacao.itens.map((item) => (
                  <tr key={item.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-4 py-2">{item.numero}</td>
                    <td className="px-4 py-2">{item.descricao}</td>
                    <td className="px-4 py-2">
                      {item.quantidade} {item.unidadeMedida ?? ""}
                    </td>
                    <td className="px-4 py-2">
                      {item.valorUnitarioEstimado !== null
                        ? item.valorUnitarioEstimado.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2">{item.situacao ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {licitacao.fonte === "MANUAL" && <AdicionarItemManualForm licitacaoId={licitacao.id} />}
        </CardContent>
      </Card>

      {ehGestor && (
        <Card>
          <CardHeader>
            <CardTitle>Participações vinculadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(participacoesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-500">Nenhuma participação criada para este edital ainda.</p>
            ) : (
              (participacoesQuery.data ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-900">{p.clienteRazaoSocial}</span>
                  <Badge tone="gold">{STATUS_PARTICIPACAO_LABELS[p.status]}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(eventosQuery.data ?? []).length === 0 && <p className="text-sm text-ink-500">Sem eventos ainda.</p>}
          {(eventosQuery.data ?? []).map((evento) => (
            <div key={evento.id} className="border-l-2 border-gold-200 pl-3 text-sm">
              <p className="text-ink-900">{evento.descricao}</p>
              <p className="text-xs text-ink-500">
                {new Date(evento.criadoEm).toLocaleString("pt-BR")}
                {evento.autorNome ? ` · ${evento.autorNome}` : " · sistema"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({ label, valor, className }: { label: string; valor: string; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <p className="text-sm text-ink-900">{valor || "—"}</p>
    </div>
  );
}

function formatData(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

function AdicionarItemManualForm({ licitacaoId }: { licitacaoId: string }) {
  const queryClient = useQueryClient();
  const [numero, setNumero] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("");
  const [quantidade, setQuantidade] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adicionarItemManual(licitacaoId, {
        numero: Number(numero),
        descricao,
        unidadeMedida: unidadeMedida || undefined,
        quantidade: Number(quantidade),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes", licitacaoId] });
      setNumero("");
      setDescricao("");
      setUnidadeMedida("");
      setQuantidade("");
    },
  });

  return (
    <form
      className="flex flex-wrap items-end gap-2 border-t border-ink-100 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="w-16">
        <Label htmlFor="item-numero">#</Label>
        <Input id="item-numero" type="number" min={1} value={numero} onChange={(e) => setNumero(e.target.value)} required />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="item-descricao">Descrição</Label>
        <Input id="item-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
      </div>
      <div className="w-28">
        <Label htmlFor="item-unidade">Unidade</Label>
        <Input id="item-unidade" value={unidadeMedida} onChange={(e) => setUnidadeMedida(e.target.value)} />
      </div>
      <div className="w-24">
        <Label htmlFor="item-quantidade">Qtd.</Label>
        <Input
          id="item-quantidade"
          type="number"
          step="0.001"
          min={0}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={mutation.isPending}>
        {mutation.isPending ? "Adicionando…" : "Adicionar item"}
      </Button>
      {mutation.error && (
        <p className="w-full text-sm text-red-600">
          {mutation.error instanceof ApiError ? mutation.error.message : "Erro ao adicionar item."}
        </p>
      )}
    </form>
  );
}
