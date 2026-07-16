import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACAO_AUDITORIA_LABELS, type FiltroAccessLogInput, type FiltroAuditLogInput } from "@petrus/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { listarUsuarios } from "@/lib/api/usuarios";
import { aplicarRetencao, listarAccessLog, listarAuditLog } from "@/lib/api/auditoria";

export function AuditoriaPage() {
  const queryClient = useQueryClient();
  const usuariosQuery = useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });

  const [filtroLog, setFiltroLog] = useState<FiltroAuditLogInput>({});
  const [filtroAcesso, setFiltroAcesso] = useState<FiltroAccessLogInput>({});

  const auditLogQuery = useQuery({
    queryKey: ["auditoria-log", filtroLog],
    queryFn: () => listarAuditLog(filtroLog),
  });
  const accessLogQuery = useQuery({
    queryKey: ["auditoria-acessos", filtroAcesso],
    queryFn: () => listarAccessLog(filtroAcesso),
  });

  const retencaoMutation = useMutation({
    mutationFn: aplicarRetencao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditoria-log"] });
      queryClient.invalidateQueries({ queryKey: ["auditoria-acessos"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Auditoria e Compliance</h1>
        <p className="text-sm text-ink-500">
          Log de alterações e de acesso ao sistema (LGPD). Visível apenas ao Master.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Política de retenção</CardTitle>
          <Button
            variant="secondary"
            size="sm"
            disabled={retencaoMutation.isPending}
            onClick={() => {
              if (confirm("Aplicar a política de retenção agora? Registros mais antigos que o limite configurado serão excluídos permanentemente.")) {
                retencaoMutation.mutate();
              }
            }}
          >
            {retencaoMutation.isPending ? "Aplicando…" : "Aplicar retenção agora"}
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-ink-500">
          <p>
            O período de retenção é definido em Configurações do Sistema. Registros de auditoria e de acesso mais
            antigos que esse período podem ser purgados manualmente aqui.
          </p>
          {retencaoMutation.data && (
            <p className="mt-2 font-medium text-emerald-700">
              {retencaoMutation.data.auditLogsRemovidos} log(s) de alteração e{" "}
              {retencaoMutation.data.accessLogsRemovidos} log(s) de acesso removidos.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log de alterações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="log-entidade">Entidade</Label>
              <Input
                id="log-entidade"
                placeholder="Ex.: Cliente"
                value={filtroLog.entidade ?? ""}
                onChange={(e) => setFiltroLog((f) => ({ ...f, entidade: e.target.value || undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="log-usuario">Usuário</Label>
              <select
                id="log-usuario"
                className="h-10 w-full rounded-md border border-ink-100 bg-white px-2 text-sm"
                value={filtroLog.usuarioId ?? ""}
                onChange={(e) => setFiltroLog((f) => ({ ...f, usuarioId: e.target.value || undefined }))}
              >
                <option value="">Todos</option>
                {usuariosQuery.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="log-inicio">Início</Label>
              <Input
                id="log-inicio"
                type="date"
                value={filtroLog.dataInicio ?? ""}
                onChange={(e) => setFiltroLog((f) => ({ ...f, dataInicio: e.target.value || undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="log-fim">Fim</Label>
              <Input
                id="log-fim"
                type="date"
                value={filtroLog.dataFim ?? ""}
                onChange={(e) => setFiltroLog((f) => ({ ...f, dataFim: e.target.value || undefined }))}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                  <th className="py-1.5 pr-3">Data/hora</th>
                  <th className="py-1.5 pr-3">Usuário</th>
                  <th className="py-1.5 pr-3">Ação</th>
                  <th className="py-1.5 pr-3">Entidade</th>
                  <th className="py-1.5 pr-3">ID</th>
                </tr>
              </thead>
              <tbody>
                {auditLogQuery.data?.map((log) => (
                  <tr key={log.id} className="border-b border-ink-50">
                    <td className="py-1.5 pr-3 text-ink-500">{new Date(log.criadoEm).toLocaleString("pt-BR")}</td>
                    <td className="py-1.5 pr-3 text-ink-900">{log.usuarioNome ?? "—"}</td>
                    <td className="py-1.5 pr-3">
                      <Badge tone={log.acao === "DELETE" ? "danger" : log.acao === "CREATE" ? "success" : "gold"}>
                        {ACAO_AUDITORIA_LABELS[log.acao]}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-3 text-ink-500">{log.entidade}</td>
                    <td className="py-1.5 pr-3 text-ink-400">{log.entidadeId}</td>
                  </tr>
                ))}
                {auditLogQuery.data?.length === 0 && (
                  <tr>
                    <td className="py-2 text-ink-500" colSpan={5}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log de acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="acesso-usuario">Usuário</Label>
              <select
                id="acesso-usuario"
                className="h-10 w-full rounded-md border border-ink-100 bg-white px-2 text-sm"
                value={filtroAcesso.usuarioId ?? ""}
                onChange={(e) => setFiltroAcesso((f) => ({ ...f, usuarioId: e.target.value || undefined }))}
              >
                <option value="">Todos</option>
                {usuariosQuery.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="acesso-sucesso">Resultado</Label>
              <select
                id="acesso-sucesso"
                className="h-10 w-full rounded-md border border-ink-100 bg-white px-2 text-sm"
                value={filtroAcesso.sucesso === undefined ? "" : String(filtroAcesso.sucesso)}
                onChange={(e) =>
                  setFiltroAcesso((f) => ({
                    ...f,
                    sucesso: e.target.value === "" ? undefined : e.target.value === "true",
                  }))
                }
              >
                <option value="">Todos</option>
                <option value="true">Sucesso</option>
                <option value="false">Falha</option>
              </select>
            </div>
            <div>
              <Label htmlFor="acesso-inicio">Início</Label>
              <Input
                id="acesso-inicio"
                type="date"
                value={filtroAcesso.dataInicio ?? ""}
                onChange={(e) => setFiltroAcesso((f) => ({ ...f, dataInicio: e.target.value || undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="acesso-fim">Fim</Label>
              <Input
                id="acesso-fim"
                type="date"
                value={filtroAcesso.dataFim ?? ""}
                onChange={(e) => setFiltroAcesso((f) => ({ ...f, dataFim: e.target.value || undefined }))}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                  <th className="py-1.5 pr-3">Data/hora</th>
                  <th className="py-1.5 pr-3">E-mail</th>
                  <th className="py-1.5 pr-3">IP</th>
                  <th className="py-1.5 pr-3">Resultado</th>
                  <th className="py-1.5 pr-3">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {accessLogQuery.data?.map((log) => (
                  <tr key={log.id} className="border-b border-ink-50">
                    <td className="py-1.5 pr-3 text-ink-500">{new Date(log.criadoEm).toLocaleString("pt-BR")}</td>
                    <td className="py-1.5 pr-3 text-ink-900">{log.email}</td>
                    <td className="py-1.5 pr-3 text-ink-500">{log.ip ?? "—"}</td>
                    <td className="py-1.5 pr-3">
                      <Badge tone={log.sucesso ? "success" : "danger"}>{log.sucesso ? "Sucesso" : "Falha"}</Badge>
                    </td>
                    <td className="py-1.5 pr-3 text-ink-500">{log.motivo ?? "—"}</td>
                  </tr>
                ))}
                {accessLogQuery.data?.length === 0 && (
                  <tr>
                    <td className="py-2 text-ink-500" colSpan={5}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
