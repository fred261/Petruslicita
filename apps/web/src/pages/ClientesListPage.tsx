import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { listarClientes } from "@/lib/api/clientes";

export function ClientesListPage() {
  const [busca, setBusca] = useState("");
  const clientesQuery = useQuery({ queryKey: ["clientes"], queryFn: listarClientes });

  const clientesFiltrados = (clientesQuery.data ?? []).filter((cliente) =>
    `${cliente.razaoSocial} ${cliente.nomeFantasia ?? ""} ${cliente.cnpj}`
      .toLowerCase()
      .includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Clientes</h1>
          <p className="text-sm text-ink-500">Carteira de empresas assessoradas pelo escritório.</p>
        </div>
        <Link
          to="/clientes/novo"
          className="inline-flex h-10 items-center justify-center rounded-md bg-gold-gradient px-4 text-sm font-medium text-white shadow-sm hover:brightness-105"
        >
          Novo cliente
        </Link>
      </div>

      <Input
        placeholder="Buscar por razão social, nome fantasia ou CNPJ…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clientesFiltrados.map((cliente) => (
          <Link key={cliente.id} to={`/clientes/${cliente.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-gold-600">
                    <Building2 className="h-4 w-4 shrink-0" />
                  </div>
                  <Badge tone={cliente.status === "ATIVO" ? "success" : "danger"}>
                    {cliente.status === "ATIVO" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm font-semibold text-ink-900">{cliente.razaoSocial}</p>
                <p className="text-xs text-ink-500">{formatCnpj(cliente.cnpj)}</p>
                <p className="line-clamp-1 text-xs text-ink-500">{cliente.cnaePrincipalDescricao}</p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {clientesFiltrados.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-ink-500">
            {clientesQuery.isLoading ? "Carregando…" : "Nenhum cliente encontrado."}
          </p>
        )}
      </div>
    </div>
  );
}

function formatCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
