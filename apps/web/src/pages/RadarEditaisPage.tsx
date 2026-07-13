import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { RefreshCw, Sparkles } from "lucide-react";
import { MODALIDADES_PNCP, UFS } from "@petrus/shared";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { listarLicitacoes, sincronizarPncp } from "@/lib/api/licitacoes";
import { criarParticipacao } from "@/lib/api/participacoes";
import { listarClientes } from "@/lib/api/clientes";
import { useAuth } from "@/lib/auth-context";

export function RadarEditaisPage() {
  const { user } = useAuth();
  const ehGestor = user?.papel === "MASTER" || user?.papel === "ADMIN";
  const queryClient = useQueryClient();

  const [clienteId, setClienteId] = useState("");
  const [uf, setUf] = useState("");
  const [modalidadeCodigo, setModalidadeCodigo] = useState("");
  const [palavraChave, setPalavraChave] = useState("");
  const [mostrarSincronizar, setMostrarSincronizar] = useState(false);

  const clientesQuery = useQuery({ queryKey: ["clientes"], queryFn: listarClientes });

  const filtro = {
    clienteId: clienteId || undefined,
    uf: uf ? [uf as (typeof UFS)[number]] : undefined,
    modalidadeCodigo: modalidadeCodigo ? [modalidadeCodigo] : undefined,
    palavraChave: palavraChave || undefined,
  };
  const licitacoesQuery = useQuery({
    queryKey: ["licitacoes", filtro],
    queryFn: () => listarLicitacoes(filtro),
  });

  const criarParticipacaoMutation = useMutation({
    mutationFn: criarParticipacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Radar de Editais</h1>
          <p className="text-sm text-ink-500">Editais captados do PNCP e cadastrados manualmente.</p>
        </div>
        <div className="flex gap-2">
          {ehGestor && (
            <Button variant="secondary" onClick={() => setMostrarSincronizar((v) => !v)}>
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronizar PNCP
            </Button>
          )}
          <Link
            to="/editais/novo"
            className="inline-flex h-10 items-center justify-center rounded-md bg-gold-gradient px-4 text-sm font-medium text-white shadow-sm hover:brightness-105"
          >
            Cadastrar manualmente
          </Link>
        </div>
      </div>

      {mostrarSincronizar && <SincronizarPncpForm onDone={() => setMostrarSincronizar(false)} />}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="clienteId">Ver sugestões para o cliente</Label>
            <select
              id="clienteId"
              className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">— nenhum —</option>
              {(clientesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <select
              id="uf"
              className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
            >
              <option value="">Todas</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="modalidade">Modalidade</Label>
            <select
              id="modalidade"
              className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
              value={modalidadeCodigo}
              onChange={(e) => setModalidadeCodigo(e.target.value)}
            >
              <option value="">Todas</option>
              {MODALIDADES_PNCP.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="palavraChave">Palavra-chave no objeto</Label>
            <Input
              id="palavraChave"
              value={palavraChave}
              onChange={(e) => setPalavraChave(e.target.value)}
              placeholder="ex: construção, informática..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(licitacoesQuery.data ?? []).map((licitacao) => (
          <Card key={licitacao.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone={licitacao.fonte === "PNCP" ? "gold" : "neutral"}>{licitacao.fonte}</Badge>
                  <span className="text-xs text-ink-500">{licitacao.modalidadeNome}</span>
                  <span className="text-xs text-ink-500">
                    {licitacao.uf}
                    {licitacao.municipio ? ` · ${licitacao.municipio}` : ""}
                  </span>
                  {licitacao.matchScore !== undefined && licitacao.matchScore > 0 && (
                    <Badge tone="success" className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Sugestão ({licitacao.matchScore}
                      {licitacao.matchTermos?.length ? `: ${licitacao.matchTermos.join(", ")}` : ""})
                    </Badge>
                  )}
                </div>
                <Link to={`/editais/${licitacao.id}`} className="font-medium text-ink-900 hover:underline">
                  {licitacao.orgaoNome}
                </Link>
                <p className="line-clamp-2 text-sm text-ink-700">{licitacao.objeto}</p>
                <p className="mt-1 text-xs text-ink-500">
                  Processo {licitacao.numeroProcesso}
                  {licitacao.valorEstimado !== null &&
                    ` · ${licitacao.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                </p>
              </div>
              <div className="shrink-0">
                <Button
                  size="sm"
                  disabled={!clienteId || criarParticipacaoMutation.isPending}
                  title={!clienteId ? "Selecione um cliente para criar a participação" : undefined}
                  onClick={() =>
                    criarParticipacaoMutation.mutate({ clienteId, licitacaoId: licitacao.id })
                  }
                >
                  Criar Participação
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {criarParticipacaoMutation.error && (
          <p className="text-sm text-red-600">
            {criarParticipacaoMutation.error instanceof ApiError
              ? criarParticipacaoMutation.error.message
              : "Erro ao criar participação."}
          </p>
        )}

        {licitacoesQuery.data?.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-500">
            {licitacoesQuery.isLoading ? "Carregando…" : "Nenhum edital encontrado com esses filtros."}
          </p>
        )}
      </div>
    </div>
  );
}

function SincronizarPncpForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [uf, setUf] = useState("");
  const [modalidadeCodigo, setModalidadeCodigo] = useState("6");
  const hoje = new Date();
  const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [dataInicial, setDataInicial] = useState(formatYyyymmdd(seteDiasAtras));
  const [dataFinal, setDataFinal] = useState(formatYyyymmdd(hoje));

  const mutation = useMutation({
    mutationFn: () =>
      sincronizarPncp({
        uf: (uf || undefined) as never,
        modalidadeCodigo,
        dataInicial,
        dataFinal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      onDone();
    },
  });

  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium text-ink-900">Sincronizar com o PNCP</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="sync-uf">UF (opcional)</Label>
            <select
              id="sync-uf"
              className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
            >
              <option value="">Todas</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sync-modalidade">Modalidade</Label>
            <select
              id="sync-modalidade"
              className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
              value={modalidadeCodigo}
              onChange={(e) => setModalidadeCodigo(e.target.value)}
            >
              {MODALIDADES_PNCP.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sync-inicio">Data inicial</Label>
            <Input
              id="sync-inicio"
              type="date"
              value={formatIso(dataInicial)}
              onChange={(e) => setDataInicial(formatYyyymmdd(new Date(e.target.value)))}
            />
          </div>
          <div>
            <Label htmlFor="sync-fim">Data final</Label>
            <Input
              id="sync-fim"
              type="date"
              value={formatIso(dataFinal)}
              onChange={(e) => setDataFinal(formatYyyymmdd(new Date(e.target.value)))}
            />
          </div>
        </div>
        {mutation.error && (
          <p className="text-sm text-red-600">
            {mutation.error instanceof ApiError ? mutation.error.message : "Erro ao sincronizar com o PNCP."}
          </p>
        )}
        {mutation.data && (
          <p className="text-sm text-emerald-700">
            {mutation.data.encontradas} editais encontrados — {mutation.data.criadas} novos,{" "}
            {mutation.data.atualizadas} atualizados.
          </p>
        )}
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Sincronizando…" : "Sincronizar agora"}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatYyyymmdd(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function formatIso(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return "";
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
