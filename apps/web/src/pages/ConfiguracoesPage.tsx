import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { configuracaoSistemaSchema, type ConfiguracaoSistemaInput } from "@petrus/shared";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ApiError } from "@/lib/api-client";
import { atualizarConfiguracaoSistema, obterConfiguracaoSistema } from "@/lib/api/prazos";

export function ConfiguracoesPage() {
  const configQuery = useQuery({ queryKey: ["prazos", "configuracao"], queryFn: obterConfiguracaoSistema });

  const form = useForm<ConfiguracaoSistemaInput>({ resolver: zodResolver(configuracaoSistemaSchema) });

  useEffect(() => {
    if (configQuery.data) {
      form.reset({
        diasAntecedenciaPrazo: configQuery.data.diasAntecedenciaPrazo,
        intervaloCobrancaSemPrazoHoras: configQuery.data.intervaloCobrancaSemPrazoHoras,
        toleranciaEscalonamentoHoras: configQuery.data.toleranciaEscalonamentoHoras,
      });
    }
  }, [configQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvarMutation = useMutation({ mutationFn: atualizarConfiguracaoSistema });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Configurações do Sistema</h1>
        <p className="text-sm text-ink-500">Parâmetros do motor de prazos e cobrança automática.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cobrança e escalonamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((data) => salvarMutation.mutate(data))} className="space-y-4">
            <div>
              <Label htmlFor="diasAntecedenciaPrazo">Dias de antecedência para cobrar antes do prazo</Label>
              <Input
                id="diasAntecedenciaPrazo"
                type="number"
                min={0}
                max={30}
                {...form.register("diasAntecedenciaPrazo", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="intervaloCobrancaSemPrazoHoras">
                Intervalo de cobrança quando não há prazo definido (horas)
              </Label>
              <Input
                id="intervaloCobrancaSemPrazoHoras"
                type="number"
                min={1}
                max={720}
                {...form.register("intervaloCobrancaSemPrazoHoras", { valueAsNumber: true })}
              />
              <p className="mt-1 text-xs text-ink-500">168h = semanal (padrão).</p>
            </div>
            <div>
              <Label htmlFor="toleranciaEscalonamentoHoras">
                Tolerância antes de escalonar ao Administrador (horas)
              </Label>
              <Input
                id="toleranciaEscalonamentoHoras"
                type="number"
                min={1}
                max={240}
                {...form.register("toleranciaEscalonamentoHoras", { valueAsNumber: true })}
              />
            </div>

            {salvarMutation.error && (
              <p className="text-sm text-red-600">
                {salvarMutation.error instanceof ApiError ? salvarMutation.error.message : "Erro ao salvar."}
              </p>
            )}
            {salvarMutation.isSuccess && <p className="text-sm text-emerald-700">Configurações salvas.</p>}

            <Button type="submit" disabled={salvarMutation.isPending}>
              {salvarMutation.isPending ? "Salvando…" : "Salvar configurações"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
