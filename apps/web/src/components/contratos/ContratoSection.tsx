import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TIPO_ITEM_CRONOGRAMA, TIPO_ITEM_CRONOGRAMA_LABELS, STATUS_CONTRATO_LABELS, type TipoItemCronograma } from "@petrus/shared";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api-client";
import {
  adicionarItemCronograma,
  buscarContrato,
  criarContrato,
  marcarItemCronogramaConcluido,
} from "@/lib/api/contratos";

export function ContratoSection({ participacaoId }: { participacaoId: string }) {
  const queryKey = ["contrato", participacaoId];
  const contratoQuery = useQuery({ queryKey, queryFn: () => buscarContrato(participacaoId) });

  if (contratoQuery.isLoading) return null;

  return (
    <CollapsibleSection title="Contrato" defaultOpen>
      {contratoQuery.data ? (
        <ContratoDetalhe contrato={contratoQuery.data} queryKey={queryKey} />
      ) : (
        <RegistrarContratoForm participacaoId={participacaoId} queryKey={queryKey} />
      )}
    </CollapsibleSection>
  );
}

function RegistrarContratoForm({ participacaoId, queryKey }: { participacaoId: string; queryKey: unknown[] }) {
  const queryClient = useQueryClient();
  const [numero, setNumero] = useState("");
  const [valorFinal, setValorFinal] = useState("");
  const [vigenciaInicio, setVigenciaInicio] = useState("");
  const [vigenciaFim, setVigenciaFim] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      criarContrato(participacaoId, {
        numero,
        valorFinal: Number(valorFinal),
        vigenciaInicio,
        vigenciaFim,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <p className="text-sm text-ink-500 sm:col-span-2">
        Participação contratada — registre os dados do contrato.
      </p>
      <div>
        <Label htmlFor="contrato-numero">Número do contrato</Label>
        <Input id="contrato-numero" value={numero} onChange={(e) => setNumero(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="contrato-valor">Valor final (R$)</Label>
        <Input
          id="contrato-valor"
          type="number"
          step="0.01"
          value={valorFinal}
          onChange={(e) => setValorFinal(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="contrato-inicio">Vigência — início</Label>
        <Input
          id="contrato-inicio"
          type="date"
          value={vigenciaInicio}
          onChange={(e) => setVigenciaInicio(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="contrato-fim">Vigência — fim</Label>
        <Input id="contrato-fim" type="date" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} required />
      </div>
      {mutation.error && (
        <p className="text-sm text-red-600 sm:col-span-2">
          {mutation.error instanceof ApiError ? mutation.error.message : "Erro ao registrar contrato."}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Registrar contrato"}
        </Button>
      </div>
    </form>
  );
}

function ContratoDetalhe({
  contrato,
  queryKey,
}: {
  contrato: NonNullable<Awaited<ReturnType<typeof buscarContrato>>>;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<TipoItemCronograma>("ENTREGA");
  const [descricao, setDescricao] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [valorPrevisto, setValorPrevisto] = useState("");

  const adicionarMutation = useMutation({
    mutationFn: () =>
      adicionarItemCronograma(contrato.id, {
        tipo,
        descricao,
        dataPrevista,
        valorPrevisto: valorPrevisto ? Number(valorPrevisto) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDescricao("");
      setDataPrevista("");
      setValorPrevisto("");
    },
  });

  const concluirMutation = useMutation({
    mutationFn: ({ itemId, concluido }: { itemId: string; concluido: boolean }) =>
      marcarItemCronogramaConcluido(itemId, concluido),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Número" valor={contrato.numero} />
        <Campo label="Status" valor={STATUS_CONTRATO_LABELS[contrato.status]} />
        <Campo
          label="Valor final"
          valor={contrato.valorFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        />
        <Campo
          label="Vigência"
          valor={`${new Date(contrato.vigenciaInicio).toLocaleDateString("pt-BR")} — ${new Date(contrato.vigenciaFim).toLocaleDateString("pt-BR")}`}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-900">Cronograma de entregas/faturamento</p>
        <div className="space-y-2">
          {contrato.cronograma.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.concluido}
                  onChange={(e) => concluirMutation.mutate({ itemId: item.id, concluido: e.target.checked })}
                />
                <span className={item.concluido ? "text-ink-400 line-through" : "text-ink-900"}>
                  {item.descricao}
                </span>
              </label>
              <Badge tone="neutral">{TIPO_ITEM_CRONOGRAMA_LABELS[item.tipo]}</Badge>
              <span className="shrink-0 text-xs text-ink-500">
                {new Date(item.dataPrevista).toLocaleDateString("pt-BR")}
              </span>
            </div>
          ))}
          {contrato.cronograma.length === 0 && <p className="text-sm text-ink-500">Nenhum item ainda.</p>}
        </div>

        <form
          className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink-100 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            adicionarMutation.mutate();
          }}
        >
          <div className="w-32">
            <Label htmlFor="cronograma-tipo">Tipo</Label>
            <select
              id="cronograma-tipo"
              className="h-10 w-full rounded-md border border-ink-100 bg-white px-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoItemCronograma)}
            >
              {TIPO_ITEM_CRONOGRAMA.map((t) => (
                <option key={t} value={t}>
                  {TIPO_ITEM_CRONOGRAMA_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="cronograma-descricao">Descrição</Label>
            <Input id="cronograma-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="cronograma-data">Data prevista</Label>
            <Input
              id="cronograma-data"
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={adicionarMutation.isPending}>
            {adicionarMutation.isPending ? "Adicionando…" : "Adicionar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-sm text-ink-900">{valor}</p>
    </div>
  );
}
