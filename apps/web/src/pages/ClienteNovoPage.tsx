import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { criarClienteSchema, UFS, type CriarClienteInput } from "@petrus/shared";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ApiError } from "@/lib/api-client";
import { criarCliente } from "@/lib/api/clientes";
import { listarUsuarios } from "@/lib/api/usuarios";
import { useAuth } from "@/lib/auth-context";
import { numberWithDefault, optionalNumber } from "@/lib/form-utils";

export function ClienteNovoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ehGestor = user?.papel === "MASTER" || user?.papel === "ADMIN";

  const operadoresQuery = useQuery({
    queryKey: ["usuarios"],
    queryFn: listarUsuarios,
    enabled: ehGestor,
  });

  const form = useForm<CriarClienteInput>({
    resolver: zodResolver(criarClienteSchema),
    defaultValues: { cnpj: "", palavrasChave: [], ufsInteresse: [], status: "ATIVO" },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "palavrasChave" });

  const criarMutation = useMutation({
    mutationFn: criarCliente,
    onSuccess: (cliente) => navigate(`/clientes/${cliente.id}`, { replace: true }),
  });

  const erroApi =
    criarMutation.error instanceof ApiError
      ? criarMutation.error.message
      : criarMutation.error
        ? "Erro ao consultar/cadastrar o CNPJ."
        : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Novo cliente</h1>
        <p className="text-sm text-ink-500">
          Informe o CNPJ: razão social, CNAE e endereço são preenchidos automaticamente e ficam
          travados para edição direta.
        </p>
      </div>

      <form onSubmit={form.handleSubmit((data) => criarMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>CNPJ</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              error={form.formState.errors.cnpj?.message}
              {...form.register("cnpj")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfil de matching (editável)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      placeholder="Peso"
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
            )}
          </CardContent>
        </Card>

        {erroApi && <p className="text-sm text-red-600">{erroApi}</p>}

        <Button type="submit" disabled={criarMutation.isPending}>
          {criarMutation.isPending ? "Consultando CNPJ e cadastrando…" : "Cadastrar cliente"}
        </Button>
      </form>
    </div>
  );
}
