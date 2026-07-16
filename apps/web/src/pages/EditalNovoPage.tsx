import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { criarLicitacaoManualSchema, MODALIDADES_PNCP, UFS, type CriarLicitacaoManualInput } from "@petrus/shared";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ApiError } from "@/lib/api-client";
import { criarLicitacaoManual } from "@/lib/api/licitacoes";
import { optionalNumber } from "@/lib/form-utils";

export function EditalNovoPage() {
  const navigate = useNavigate();
  const form = useForm<CriarLicitacaoManualInput>({ resolver: zodResolver(criarLicitacaoManualSchema) });

  const criarMutation = useMutation({
    mutationFn: criarLicitacaoManual,
    onSuccess: (licitacao) => navigate(`/editais/${licitacao.id}`, { replace: true }),
  });

  const erroApi =
    criarMutation.error instanceof ApiError ? criarMutation.error.message : criarMutation.error ? "Erro ao cadastrar edital." : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Cadastrar edital manualmente</h1>
        <p className="text-sm text-ink-500">Para editais fora do PNCP (municipais, estaduais ou outras fontes).</p>
      </div>

      <form onSubmit={form.handleSubmit((data) => criarMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do edital</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="orgaoNome">Órgão</Label>
              <Input id="orgaoNome" error={form.formState.errors.orgaoNome?.message} {...form.register("orgaoNome")} />
            </div>
            <div>
              <Label htmlFor="orgaoCnpj">CNPJ do órgão</Label>
              <Input
                id="orgaoCnpj"
                placeholder="00.000.000/0000-00"
                error={form.formState.errors.orgaoCnpj?.message}
                {...form.register("orgaoCnpj")}
              />
            </div>
            <div>
              <Label htmlFor="esfera">Esfera</Label>
              <select
                id="esfera"
                className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
                {...form.register("esfera")}
              >
                <option value="">Não informado</option>
                <option value="Federal">Federal</option>
                <option value="Estadual">Estadual</option>
                <option value="Municipal">Municipal</option>
              </select>
            </div>
            <div>
              <Label htmlFor="numeroProcesso">Número do processo</Label>
              <Input
                id="numeroProcesso"
                error={form.formState.errors.numeroProcesso?.message}
                {...form.register("numeroProcesso")}
              />
            </div>
            <div>
              <Label htmlFor="modalidadeNome">Modalidade</Label>
              <select
                id="modalidadeNome"
                className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
                {...form.register("modalidadeNome")}
                onChange={(e) => {
                  form.setValue("modalidadeNome", e.target.value);
                  const m = MODALIDADES_PNCP.find((m) => m.nome === e.target.value);
                  form.setValue("modalidadeCodigo", m?.codigo);
                }}
              >
                <option value="">Selecione</option>
                {MODALIDADES_PNCP.map((m) => (
                  <option key={m.codigo} value={m.nome}>
                    {m.nome}
                  </option>
                ))}
              </select>
              {form.formState.errors.modalidadeNome && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.modalidadeNome.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="objeto">Objeto</Label>
              <textarea
                id="objeto"
                className="min-h-24 w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm"
                {...form.register("objeto")}
              />
              {form.formState.errors.objeto && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.objeto.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="valorEstimado">Valor estimado (R$)</Label>
              <Input
                id="valorEstimado"
                type="number"
                step="0.01"
                {...form.register("valorEstimado", { setValueAs: optionalNumber })}
              />
            </div>
            <div>
              <Label htmlFor="uf">UF</Label>
              <select
                id="uf"
                className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
                {...form.register("uf")}
              >
                <option value="">Selecione</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              {form.formState.errors.uf && (
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.uf.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="municipio">Município</Label>
              <Input id="municipio" {...form.register("municipio")} />
            </div>
            <div>
              <Label htmlFor="dataPublicacao">Data de publicação</Label>
              <Input id="dataPublicacao" type="date" {...form.register("dataPublicacao")} />
            </div>
            <div>
              <Label htmlFor="dataSessaoAbertura">Data da sessão</Label>
              <Input id="dataSessaoAbertura" type="date" {...form.register("dataSessaoAbertura")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="linkEdital">Link do edital</Label>
              <Input id="linkEdital" placeholder="https://..." {...form.register("linkEdital")} />
            </div>
          </CardContent>
        </Card>

        {erroApi && <p className="text-sm text-red-600">{erroApi}</p>}

        <Button type="submit" disabled={criarMutation.isPending}>
          {criarMutation.isPending ? "Cadastrando…" : "Cadastrar edital"}
        </Button>
      </form>
    </div>
  );
}
