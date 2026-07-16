import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { STATUS_PARTICIPACAO_LABELS, URGENCIA_PENDENCIA, URGENCIA_PENDENCIA_LABELS, type UrgenciaPendencia } from "@petrus/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { executarVerificacaoAgora, listarPendencias } from "@/lib/api/prazos";
import { useAuth } from "@/lib/auth-context";

const TONE_POR_URGENCIA: Record<UrgenciaPendencia, "danger" | "warning" | "gold" | "neutral"> = {
  ATRASADO: "danger",
  VENCENDO: "warning",
  PROXIMO: "gold",
  SEM_PRAZO: "neutral",
};

export function PendenciasPage() {
  const { user } = useAuth();
  const ehMaster = user?.papel === "MASTER";
  const queryClient = useQueryClient();

  const pendenciasQuery = useQuery({ queryKey: ["prazos", "pendencias"], queryFn: listarPendencias });

  const executarMutation = useMutation({
    mutationFn: executarVerificacaoAgora,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prazos", "pendencias"] }),
  });

  const grupos = URGENCIA_PENDENCIA.map((urgencia) => ({
    urgencia,
    itens: (pendenciasQuery.data ?? []).filter((p) => p.urgencia === urgencia),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Central de Pendências</h1>
          <p className="text-sm text-ink-500">
            {user?.papel === "OPERADOR" ? "Suas participações em aberto." : "Participações em aberto do escritório."}
          </p>
        </div>
        {ehMaster && (
          <Button variant="secondary" onClick={() => executarMutation.mutate()} disabled={executarMutation.isPending}>
            <RefreshCw className="h-3.5 w-3.5" />
            {executarMutation.isPending ? "Executando…" : "Executar verificação agora"}
          </Button>
        )}
      </div>

      {executarMutation.data && (
        <p className="text-sm text-emerald-700">
          {executarMutation.data.participacoesAvaliadas} participações avaliadas — {executarMutation.data.cobrancasEnviadas}{" "}
          cobrança(s), {executarMutation.data.escalonamentosEnviados} escalonamento(s) e{" "}
          {executarMutation.data.alertasDocumentosEnviados} alerta(s) de documento enviados.
        </p>
      )}
      {executarMutation.error && (
        <p className="text-sm text-red-600">
          {executarMutation.error instanceof ApiError ? executarMutation.error.message : "Erro ao executar verificação."}
        </p>
      )}

      {grupos.map(({ urgencia, itens }) => (
        <Card key={urgencia}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge tone={TONE_POR_URGENCIA[urgencia]}>{URGENCIA_PENDENCIA_LABELS[urgencia]}</Badge>
              <span className="text-xs font-normal text-ink-500">({itens.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {itens.length === 0 ? (
              <p className="text-sm text-ink-500">Nenhuma pendência nesta categoria.</p>
            ) : (
              itens.map((p) => (
                <Link
                  key={p.participacaoId}
                  to={`/participacoes/${p.participacaoId}`}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 py-2 text-sm last:border-0 hover:underline"
                >
                  <div className="min-w-0">
                    <p className="truncate text-ink-900">
                      {p.clienteRazaoSocial} — {p.licitacaoOrgaoNome}
                    </p>
                    <p className="text-xs text-ink-500">
                      {p.licitacaoNumeroProcesso} · {STATUS_PARTICIPACAO_LABELS[p.status]}
                      {p.responsavelNome ? ` · ${p.responsavelNome}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-500">
                    {p.proximoPrazo ? new Date(p.proximoPrazo).toLocaleDateString("pt-BR") : "—"}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
