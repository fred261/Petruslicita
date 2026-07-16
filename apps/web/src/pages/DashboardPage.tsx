import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  FASE_FUNIL_LABELS,
  STATUS_PARTICIPACAO_LABELS,
  type ExportarFormato,
  type ExportarTipo,
  type FiltroDashboardInput,
} from "@petrus/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";
import { listarClientes } from "@/lib/api/clientes";
import { buscarConsolidado, buscarFunil, buscarIndicadoresCliente, exportarRelatorio } from "@/lib/api/dashboard";

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const FASE_TONS: Record<string, string> = {
  CAPTACAO: "bg-ink-300",
  PREPARACAO: "bg-gold-300",
  EM_DISPUTA: "bg-gold-500",
  VENCIDAS_E_PERDIDAS: "bg-emerald-500",
  FORA_DO_FUNIL: "bg-red-300",
};

export function DashboardPage() {
  const { user } = useAuth();
  const isGestor = user?.papel === "MASTER" || user?.papel === "ADMIN";

  const [filtro, setFiltro] = useState<FiltroDashboardInput>({});
  const [clienteIndicadorId, setClienteIndicadorId] = useState<string>("");
  const [exportando, setExportando] = useState<string | null>(null);

  const clientesQuery = useQuery({ queryKey: ["clientes"], queryFn: listarClientes });
  const funilQuery = useQuery({ queryKey: ["dashboard-funil", filtro], queryFn: () => buscarFunil(filtro) });
  const consolidadoQuery = useQuery({
    queryKey: ["dashboard-consolidado", filtro],
    queryFn: () => buscarConsolidado(filtro),
    enabled: isGestor,
  });
  const indicadoresQuery = useQuery({
    queryKey: ["dashboard-indicadores", clienteIndicadorId],
    queryFn: () => buscarIndicadoresCliente(clienteIndicadorId),
    enabled: !!clienteIndicadorId,
  });

  const maiorFase = useMemo(() => {
    if (!funilQuery.data) return 1;
    return Math.max(1, ...funilQuery.data.fases.map((f) => f.total));
  }, [funilQuery.data]);

  async function exportar(tipo: ExportarTipo, formato: ExportarFormato) {
    setExportando(`${tipo}-${formato}`);
    try {
      await exportarRelatorio({
        tipo,
        formato,
        clienteId: filtro.clienteId,
        dataInicio: filtro.dataInicio,
        dataFim: filtro.dataFim,
      });
    } finally {
      setExportando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Olá, {user?.nome.split(" ")[0]}</h1>
        <p className="text-sm text-ink-500">Funil de participações, indicadores por cliente e relatórios.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="filtro-cliente">Cliente</Label>
            <select
              id="filtro-cliente"
              className="h-10 w-full rounded-md border border-ink-100 bg-white px-2 text-sm"
              value={filtro.clienteId ?? ""}
              onChange={(e) => setFiltro((f) => ({ ...f, clienteId: e.target.value || undefined }))}
            >
              <option value="">Todos</option>
              {clientesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="filtro-inicio">Período — início</Label>
            <Input
              id="filtro-inicio"
              type="date"
              value={filtro.dataInicio ?? ""}
              onChange={(e) => setFiltro((f) => ({ ...f, dataInicio: e.target.value || undefined }))}
            />
          </div>
          <div>
            <Label htmlFor="filtro-fim">Período — fim</Label>
            <Input
              id="filtro-fim"
              type="date"
              value={filtro.dataFim ?? ""}
              onChange={(e) => setFiltro((f) => ({ ...f, dataFim: e.target.value || undefined }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Funil de participações</CardTitle>
          <div className="flex gap-2">
            <ExportButton
              label="PDF"
              loading={exportando === "FUNIL-PDF"}
              onClick={() => exportar("FUNIL", "PDF")}
            />
            <ExportButton
              label="Excel"
              loading={exportando === "FUNIL-XLSX"}
              onClick={() => exportar("FUNIL", "XLSX")}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {funilQuery.data && (
            <>
              <p className="text-sm text-ink-500">
                Total: <span className="font-medium text-ink-900">{funilQuery.data.totalGeral}</span> · Taxa de
                sucesso:{" "}
                <span className="font-medium text-ink-900">
                  {funilQuery.data.taxaSucesso !== null ? `${funilQuery.data.taxaSucesso}%` : "—"}
                </span>
              </p>
              <div className="space-y-3">
                {funilQuery.data.fases.map((fase) => (
                  <div key={fase.fase}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-900">{FASE_FUNIL_LABELS[fase.fase]}</span>
                      <span className="text-ink-500">{fase.total}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-ink-50">
                      <div
                        className={`h-3 rounded-full ${FASE_TONS[fase.fase]}`}
                        style={{ width: `${(fase.total / maiorFase) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-500">
                      {Object.entries(fase.porStatus).map(([status, total]) => (
                        <span key={status}>
                          {STATUS_PARTICIPACAO_LABELS[status as keyof typeof STATUS_PARTICIPACAO_LABELS]}: {total}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Indicadores por cliente</CardTitle>
          <div className="flex gap-2">
            <ExportButton
              label="PDF"
              loading={exportando === "INDICADORES_CLIENTE-PDF"}
              onClick={() => exportar("INDICADORES_CLIENTE", "PDF")}
            />
            <ExportButton
              label="Excel"
              loading={exportando === "INDICADORES_CLIENTE-XLSX"}
              onClick={() => exportar("INDICADORES_CLIENTE", "XLSX")}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label htmlFor="indicador-cliente">Selecione um cliente</Label>
            <select
              id="indicador-cliente"
              className="h-10 w-full rounded-md border border-ink-100 bg-white px-2 text-sm"
              value={clienteIndicadorId}
              onChange={(e) => setClienteIndicadorId(e.target.value)}
            >
              <option value="">—</option>
              {clientesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </select>
          </div>

          {indicadoresQuery.data && (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <Indicador label="Participações" valor={indicadoresQuery.data.totalParticipacoes} />
              <Indicador label="Ativas" valor={indicadoresQuery.data.participacoesAtivas} />
              <Indicador label="Vencidas" valor={indicadoresQuery.data.vencidas} />
              <Indicador label="Não vencidas" valor={indicadoresQuery.data.naoVencidas} />
              <Indicador label="Descartadas" valor={indicadoresQuery.data.descartadas} />
              <Indicador
                label="Taxa de sucesso"
                valor={indicadoresQuery.data.taxaSucesso !== null ? `${indicadoresQuery.data.taxaSucesso}%` : "—"}
              />
              <Indicador
                label="Valor proposto (total)"
                valor={MOEDA.format(indicadoresQuery.data.valorTotalProposto)}
              />
              <Indicador
                label="Valor contratado (total)"
                valor={MOEDA.format(indicadoresQuery.data.valorTotalContratado)}
              />
              <Indicador label="Contratos ativos" valor={indicadoresQuery.data.contratosAtivos} />
            </div>
          )}
        </CardContent>
      </Card>

      {isGestor && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Consolidado do escritório</CardTitle>
            <div className="flex gap-2">
              <ExportButton
                label="PDF"
                loading={exportando === "CONSOLIDADO-PDF"}
                onClick={() => exportar("CONSOLIDADO", "PDF")}
              />
              <ExportButton
                label="Excel"
                loading={exportando === "CONSOLIDADO-XLSX"}
                onClick={() => exportar("CONSOLIDADO", "XLSX")}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {consolidadoQuery.data && (
              <>
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <Indicador label="Clientes" valor={consolidadoQuery.data.totalClientes} />
                  <Indicador label="Participações" valor={consolidadoQuery.data.totalParticipacoes} />
                  <Indicador label="Ativas" valor={consolidadoQuery.data.participacoesAtivas} />
                  <Indicador
                    label="Taxa de sucesso"
                    valor={consolidadoQuery.data.taxaSucesso !== null ? `${consolidadoQuery.data.taxaSucesso}%` : "—"}
                  />
                  <Indicador
                    label="Valor total contratado"
                    valor={MOEDA.format(consolidadoQuery.data.valorTotalContratado)}
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-ink-900">Ranking de clientes por valor contratado</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                          <th className="py-1.5 pr-3">Cliente</th>
                          <th className="py-1.5 pr-3">Participações</th>
                          <th className="py-1.5 pr-3">Valor contratado</th>
                          <th className="py-1.5 pr-3">Taxa de sucesso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consolidadoQuery.data.rankingClientes.map((c) => (
                          <tr key={c.clienteId} className="border-b border-ink-50">
                            <td className="py-1.5 pr-3 text-ink-900">{c.clienteRazaoSocial}</td>
                            <td className="py-1.5 pr-3 text-ink-500">{c.totalParticipacoes}</td>
                            <td className="py-1.5 pr-3 text-ink-500">{MOEDA.format(c.valorTotalContratado)}</td>
                            <td className="py-1.5 pr-3 text-ink-500">
                              {c.taxaSucesso !== null ? `${c.taxaSucesso}%` : "—"}
                            </td>
                          </tr>
                        ))}
                        {consolidadoQuery.data.rankingClientes.length === 0 && (
                          <tr>
                            <td className="py-2 text-ink-500" colSpan={4}>
                              Nenhuma participação no período selecionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Indicador({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-md border border-ink-100 bg-ink-50/50 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-lg font-semibold text-ink-900">{valor}</p>
    </div>
  );
}

function ExportButton({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" disabled={loading} onClick={onClick}>
      <Download className="h-3.5 w-3.5" />
      {loading ? "Gerando…" : label}
    </Button>
  );
}
