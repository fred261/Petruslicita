import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { criarUsuarioSchema, ROLE_LABELS, type CriarUsuarioInput, type Role } from "@petrus/shared";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import {
  atualizarUsuario,
  criarUsuario,
  excluirUsuario,
  listarUsuarios,
  redefinirSenhaUsuario,
} from "@/lib/api/usuarios";
import { listarClientes } from "@/lib/api/clientes";

export function UsuariosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const usuariosQuery = useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });
  const clientesQuery = useQuery({ queryKey: ["clientes"], queryFn: listarClientes });

  const papeisCriaveis: Role[] = user?.papel === "MASTER" ? ["MASTER", "ADMIN", "OPERADOR"] : ["OPERADOR"];

  const form = useForm<CriarUsuarioInput>({
    resolver: zodResolver(criarUsuarioSchema),
    defaultValues: { papel: papeisCriaveis[0], clienteIds: [] },
  });
  const papelSelecionado = form.watch("papel");

  const criarMutation = useMutation({
    mutationFn: criarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      form.reset({ papel: papeisCriaveis[0], clienteIds: [] });
      setMostrarFormulario(false);
      setErroGeral(null);
    },
    onError: (err) => setErroGeral(err instanceof ApiError ? err.message : "Erro ao criar usuário."),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => atualizarUsuario(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  const excluirMutation = useMutation({
    mutationFn: excluirUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  const redefinirSenhaMutation = useMutation({
    mutationFn: ({ id, novaSenha }: { id: string; novaSenha: string }) =>
      redefinirSenhaUsuario(id, novaSenha),
  });

  const clientesPorId = useMemo(
    () => new Map((clientesQuery.data ?? []).map((c) => [c.id, c.razaoSocial])),
    [clientesQuery.data],
  );

  const onSubmit = (data: CriarUsuarioInput) => {
    setErroGeral(null);
    criarMutation.mutate(data);
  };

  const handleRedefinirSenha = (id: string) => {
    const novaSenha = window.prompt(
      "Nova senha (mín. 10 caracteres, com maiúscula, minúscula, número e símbolo):",
    );
    if (!novaSenha) return;
    redefinirSenhaMutation.mutate(
      { id, novaSenha },
      {
        onError: (err) =>
          window.alert(err instanceof ApiError ? err.message : "Erro ao redefinir senha."),
        onSuccess: () => window.alert("Senha redefinida com sucesso."),
      },
    );
  };

  const handleExcluir = (id: string, nome: string) => {
    if (!window.confirm(`Excluir permanentemente o usuário "${nome}"? Esta ação não pode ser desfeita.`))
      return;
    excluirMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Usuários</h1>
          <p className="text-sm text-ink-500">Gestão de acesso da equipe do escritório.</p>
        </div>
        <Button onClick={() => setMostrarFormulario((v) => !v)}>
          {mostrarFormulario ? "Cancelar" : "Novo usuário"}
        </Button>
      </div>

      {mostrarFormulario && (
        <Card>
          <CardHeader>
            <CardTitle>Novo usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" error={form.formState.errors.nome?.message} {...form.register("nome")} />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  error={form.formState.errors.email?.message}
                  {...form.register("email")}
                />
              </div>
              <div>
                <Label htmlFor="papel">Perfil</Label>
                <select
                  id="papel"
                  className="h-10 w-full rounded-md border border-ink-100 bg-white px-3 text-sm"
                  {...form.register("papel")}
                >
                  {papeisCriaveis.map((papel) => (
                    <option key={papel} value={papel}>
                      {ROLE_LABELS[papel]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="senha">Senha inicial</Label>
                <Input
                  id="senha"
                  type="password"
                  error={form.formState.errors.senha?.message}
                  {...form.register("senha")}
                />
              </div>

              {papelSelecionado === "OPERADOR" && (
                <div className="sm:col-span-2">
                  <Label>Clientes atribuídos</Label>
                  <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-ink-100 p-3">
                    {(clientesQuery.data ?? []).map((cliente) => (
                      <label key={cliente.id} className="flex items-center gap-2 text-sm text-ink-700">
                        <input type="checkbox" value={cliente.id} {...form.register("clienteIds")} />
                        {cliente.razaoSocial}
                      </label>
                    ))}
                    {(clientesQuery.data ?? []).length === 0 && (
                      <p className="text-xs text-ink-500">Nenhum cliente cadastrado ainda.</p>
                    )}
                  </div>
                  {form.formState.errors.clienteIds && (
                    <p className="mt-1 text-xs text-red-600">
                      {form.formState.errors.clienteIds.message as string}
                    </p>
                  )}
                </div>
              )}

              {erroGeral && <p className="text-sm text-red-600 sm:col-span-2">{erroGeral}</p>}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={criarMutation.isPending}>
                  {criarMutation.isPending ? "Salvando…" : "Salvar usuário"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Clientes</th>
                <th className="px-4 py-3">2FA</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(usuariosQuery.data ?? []).map((usuario) => (
                <tr key={usuario.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-900">{usuario.nome}</td>
                  <td className="px-4 py-3 text-ink-700">{usuario.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone="gold">{ROLE_LABELS[usuario.papel]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500">
                    {usuario.clienteIds.map((id) => clientesPorId.get(id) ?? id).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={usuario.totpEnabled ? "success" : "neutral"}>
                      {usuario.totpEnabled ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={usuario.ativo ? "success" : "danger"}>
                      {usuario.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                    <button
                      className="text-xs font-medium text-gold-600 hover:underline"
                      onClick={() =>
                        toggleAtivoMutation.mutate({ id: usuario.id, ativo: !usuario.ativo })
                      }
                    >
                      {usuario.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      className="text-xs font-medium text-ink-500 hover:underline"
                      onClick={() => handleRedefinirSenha(usuario.id)}
                    >
                      Redefinir senha
                    </button>
                    {user?.papel === "MASTER" && (
                      <button
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => handleExcluir(usuario.id, usuario.nome)}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {usuariosQuery.data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-500">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
