import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  MOTIVO_PERDA_CATEGORIAS,
  MOTIVO_PERDA_CATEGORIA_LABELS,
  STATUS_EXIGE_MOTIVO_PERDA,
  STATUS_PARTICIPACAO_LABELS,
  TRANSICOES_PERMITIDAS,
  type MotivoPerdaCategoria,
  type StatusParticipacao,
} from "@petrus/shared";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api-client";
import { buscarLicitacao } from "@/lib/api/licitacoes";
import {
  atualizarPrazoParticipacao,
  atualizarStatusParticipacao,
  atualizarValorPropostoParticipacao,
  buscarParticipacao,
  comentarParticipacao,
  listarComentariosParticipacao,
  listarEventosParticipacao,
  selecionarItensParticipacao,
} from "@/lib/api/participacoes";
import { optionalNumber } from "@/lib/form-utils";

export function ParticipacaoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const participacaoQuery = useQuery({
    queryKey: ["participacoes", id],
    queryFn: () => buscarParticipacao(id!),
    enabled: !!id,
  });

  const licitacaoQuery = useQuery({
    queryKey: ["licitacoes", participacaoQuery.data?.licitacaoId],
    queryFn: () => buscarLicitacao(participacaoQuery.data!.licitacaoId),
    enabled: !!participacaoQuery.data,
  });

  const eventosQuery = useQuery({
    queryKey: ["participacoes", id, "eventos"],
    queryFn: () => listarEventosParticipacao(id!),
    enabled: !!id,
  });

  const invalidarTudo = () => {
    queryClient.invalidateQueries({ queryKey: ["participacoes", id] });
    queryClient.invalidateQueries({ queryKey: ["participacoes", id, "eventos"] });
  };

  if (participacaoQuery.isLoading) return <p className="text-sm text-ink-500">Carregando…</p>;
  if (!participacaoQuery.data) return <p className="text-sm text-red-600">Participação não encontrada.</p>;
  const participacao = participacaoQuery.data;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs text-ink-500">
          <Link to={`/clientes/${participacao.clienteId}`} className="hover:underline">
            {participacao.clienteRazaoSocial}
          </Link>
          {" · "}
          <Link to={`/editais/${participacao.licitacaoId}`} className="hover:underline">
            {participacao.licitacaoNumeroProcesso}
          </Link>
        </p>
        <h1 className="text-xl font-semibold text-ink-900">{participacao.licitacaoOrgaoNome}</h1>
        <p className="line-clamp-2 text-sm text-ink-500">{participacao.licitacaoObjeto}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500">Status atual</span>
            <Badge tone="gold" className="text-sm">
              {STATUS_PARTICIPACAO_LABELS[participacao.status]}
            </Badge>
          </div>
          <StatusAcoes
            participacaoId={participacao.id}
            statusAtual={participacao.status}
            valorProposto={participacao.valorProposto}
            onChanged={invalidarTudo}
          />
        </CardContent>
      </Card>

      {participacao.motivoPerdaCategoria && (
        <Card>
          <CardHeader>
            <CardTitle>Motivo de perda</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <Campo label="Categoria" valor={MOTIVO_PERDA_CATEGORIA_LABELS[participacao.motivoPerdaCategoria]} />
            <Campo label="Concorrente vencedor" valor={participacao.concorrenteVencedorNome ?? "—"} />
            <Campo
              label="Valor da proposta vencedora"
              valor={
                participacao.valorPropostaVencedora !== null
                  ? participacao.valorPropostaVencedora.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "—"
              }
            />
            <Campo
              label="Diferença percentual"
              valor={
                participacao.diferencaPercentualVencedora !== null
                  ? `${participacao.diferencaPercentualVencedora > 0 ? "+" : ""}${participacao.diferencaPercentualVencedora}%`
                  : "—"
              }
            />
            {participacao.motivoPerdaTexto && (
              <Campo label="Observações" valor={participacao.motivoPerdaTexto} className="sm:col-span-2" />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <PrazoCard participacaoId={participacao.id} proximoPrazo={participacao.proximoPrazo} onChanged={invalidarTudo} />
        <ValorPropostoCard
          participacaoId={participacao.id}
          valorProposto={participacao.valorProposto}
          onChanged={invalidarTudo}
        />
      </div>

      {licitacaoQuery.data && licitacaoQuery.data.itens.length > 0 && (
        <ItensDisputadosCard
          participacaoId={participacao.id}
          itens={licitacaoQuery.data.itens}
          itemIdsSelecionados={participacao.itemIds}
          onChanged={invalidarTudo}
        />
      )}

      <ComentariosCard participacaoId={participacao.id} />

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
      <p className="text-sm text-ink-900">{valor}</p>
    </div>
  );
}

function StatusAcoes({
  participacaoId,
  statusAtual,
  valorProposto,
  onChanged,
}: {
  participacaoId: string;
  statusAtual: StatusParticipacao;
  valorProposto: number | null;
  onChanged: () => void;
}) {
  const [statusEmMotivo, setStatusEmMotivo] = useState<StatusParticipacao | null>(null);
  const proximos = TRANSICOES_PERMITIDAS[statusAtual];

  const mutation = useMutation({
    mutationFn: (params: { status: StatusParticipacao; motivoPerda?: Parameters<typeof atualizarStatusParticipacao>[1]["motivoPerda"] }) =>
      atualizarStatusParticipacao(participacaoId, { status: params.status, motivoPerda: params.motivoPerda }),
    onSuccess: () => {
      setStatusEmMotivo(null);
      onChanged();
    },
  });

  if (proximos.length === 0) {
    return <p className="text-xs text-ink-500">Status final — sem novas transições.</p>;
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        {proximos.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === "DESCARTADA" ? "danger" : "secondary"}
            onClick={() => {
              if (STATUS_EXIGE_MOTIVO_PERDA.includes(status)) {
                setStatusEmMotivo(status);
              } else {
                mutation.mutate({ status });
              }
            }}
            disabled={mutation.isPending}
          >
            Mover para {STATUS_PARTICIPACAO_LABELS[status]}
          </Button>
        ))}
      </div>

      {statusEmMotivo && (
        <MotivoPerdaForm
          valorProposto={valorProposto}
          submitting={mutation.isPending}
          onCancel={() => setStatusEmMotivo(null)}
          onConfirm={(motivoPerda) => mutation.mutate({ status: statusEmMotivo, motivoPerda })}
        />
      )}

      {mutation.error && (
        <p className="mt-2 text-sm text-red-600">
          {mutation.error instanceof ApiError ? mutation.error.message : "Erro ao mudar status."}
        </p>
      )}
    </div>
  );
}

function MotivoPerdaForm({
  valorProposto,
  submitting,
  onCancel,
  onConfirm,
}: {
  valorProposto: number | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (motivo: {
    categoria: MotivoPerdaCategoria;
    textoLivre?: string;
    concorrenteVencedorNome?: string;
    concorrenteVencedorCnpj?: string;
    valorPropostaVencedora?: number;
  }) => void;
}) {
  const [categoria, setCategoria] = useState<MotivoPerdaCategoria>("PRECO_SUPERIOR");
  const [textoLivre, setTextoLivre] = useState("");
  const [concorrenteNome, setConcorrenteNome] = useState("");
  const [concorrenteCnpj, setConcorrenteCnpj] = useState("");
  const [valorVencedora, setValorVencedora] = useState("");

  const diferenca =
    valorProposto && valorVencedora
      ? Math.round(((Number(valorVencedora) - valorProposto) / valorProposto) * 100 * 100) / 100
      : null;

  return (
    <div className="mt-3 space-y-3 rounded-md border border-ink-100 bg-ink-50 p-4">
      <p className="text-sm font-medium text-ink-900">Motivo</p>
      <div>
        <Label htmlFor="motivo-categoria">Categoria</Label>
        <select
          id="motivo-categoria"
          className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as MotivoPerdaCategoria)}
        >
          {MOTIVO_PERDA_CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {MOTIVO_PERDA_CATEGORIA_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="motivo-concorrente">Concorrente vencedor</Label>
          <Input id="motivo-concorrente" value={concorrenteNome} onChange={(e) => setConcorrenteNome(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="motivo-concorrente-cnpj">CNPJ do concorrente</Label>
          <Input id="motivo-concorrente-cnpj" value={concorrenteCnpj} onChange={(e) => setConcorrenteCnpj(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="motivo-valor-vencedora">Valor da proposta vencedora (R$)</Label>
          <Input
            id="motivo-valor-vencedora"
            type="number"
            step="0.01"
            value={valorVencedora}
            onChange={(e) => setValorVencedora(e.target.value)}
          />
          {diferenca !== null && (
            <p className="mt-1 text-xs text-ink-500">
              Diferença: {diferenca > 0 ? "+" : ""}
              {diferenca}% em relação à sua proposta
            </p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="motivo-texto">Observações</Label>
        <textarea
          id="motivo-texto"
          className="min-h-16 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm"
          value={textoLivre}
          onChange={(e) => setTextoLivre(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={submitting}
          onClick={() =>
            onConfirm({
              categoria,
              textoLivre: textoLivre || undefined,
              concorrenteVencedorNome: concorrenteNome || undefined,
              concorrenteVencedorCnpj: concorrenteCnpj || undefined,
              valorPropostaVencedora: valorVencedora ? Number(valorVencedora) : undefined,
            })
          }
        >
          {submitting ? "Confirmando…" : "Confirmar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function PrazoCard({
  participacaoId,
  proximoPrazo,
  onChanged,
}: {
  participacaoId: string;
  proximoPrazo: string | null;
  onChanged: () => void;
}) {
  const [valor, setValor] = useState(proximoPrazo ? proximoPrazo.slice(0, 10) : "");
  useEffect(() => setValor(proximoPrazo ? proximoPrazo.slice(0, 10) : ""), [proximoPrazo]);

  const mutation = useMutation({
    mutationFn: () => atualizarPrazoParticipacao(participacaoId, { proximoPrazo: valor || null }),
    onSuccess: onChanged,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximo prazo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-ink-500">Dispara a cobrança automática de atualização nesta data.</p>
        <Input type="date" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar prazo"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ValorPropostoCard({
  participacaoId,
  valorProposto,
  onChanged,
}: {
  participacaoId: string;
  valorProposto: number | null;
  onChanged: () => void;
}) {
  const [valor, setValor] = useState(valorProposto?.toString() ?? "");
  useEffect(() => setValor(valorProposto?.toString() ?? ""), [valorProposto]);

  const mutation = useMutation({
    mutationFn: () =>
      atualizarValorPropostoParticipacao(participacaoId, { valorProposto: optionalNumber(valor) }),
    onSuccess: onChanged,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valor proposto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar valor"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ItensDisputadosCard({
  participacaoId,
  itens,
  itemIdsSelecionados,
  onChanged,
}: {
  participacaoId: string;
  itens: { id: string; numero: number; descricao: string }[];
  itemIdsSelecionados: string[];
  onChanged: () => void;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(itemIdsSelecionados));
  useEffect(() => setSelecionados(new Set(itemIdsSelecionados)), [itemIdsSelecionados]);

  const mutation = useMutation({
    mutationFn: () => selecionarItensParticipacao(participacaoId, { itemIds: [...selecionados] }),
    onSuccess: onChanged,
  });

  const toggle = (itemId: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Itens/lotes disputados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {itens.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={selecionados.has(item.id)} onChange={() => toggle(item.id)} />
              #{item.numero} — {item.descricao}
            </label>
          ))}
        </div>
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar seleção"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ComentariosCard({ participacaoId }: { participacaoId: string }) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");

  const comentariosQuery = useQuery({
    queryKey: ["participacoes", participacaoId, "comentarios"],
    queryFn: () => listarComentariosParticipacao(participacaoId),
  });

  const mutation = useMutation({
    mutationFn: () => comentarParticipacao(participacaoId, { texto }),
    onSuccess: () => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["participacoes", participacaoId, "comentarios"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anotações internas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-ink-500">Visível apenas para a equipe do escritório.</p>
        <div className="space-y-2">
          <textarea
            className="min-h-16 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm"
            placeholder="Escreva uma anotação…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !texto.trim()}>
            {mutation.isPending ? "Enviando…" : "Adicionar anotação"}
          </Button>
        </div>
        <div className="space-y-3">
          {(comentariosQuery.data ?? []).map((c) => (
            <div key={c.id} className="border-t border-ink-100 pt-2 text-sm">
              <p className="text-ink-900">{c.texto}</p>
              <p className="text-xs text-ink-500">
                {c.autorNome ?? "—"} · {new Date(c.criadoEm).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
          {(comentariosQuery.data ?? []).length === 0 && (
            <p className="text-sm text-ink-500">Nenhuma anotação ainda.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
