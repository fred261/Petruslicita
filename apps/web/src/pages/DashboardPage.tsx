import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth-context";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Olá, {user?.nome.split(" ")[0]}</h1>
        <p className="text-sm text-ink-500">
          Este é o painel inicial. O funil de licitações e os indicadores serão exibidos aqui
          quando os módulos de Captação de Editais e Pipeline de Participação forem entregues.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulo 1 em produção</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-ink-500">
          Autenticação e Cadastro de Clientes concluídos. Use o menu para gerenciar clientes
          {user && (user.papel === "MASTER" || user.papel === "ADMIN") ? " e usuários" : ""}.
        </CardContent>
      </Card>
    </div>
  );
}
