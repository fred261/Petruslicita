import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Swords } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listarConcorrentes } from "@/lib/api/concorrentes";

export function ConcorrentesPage() {
  const concorrentesQuery = useQuery({ queryKey: ["concorrentes"], queryFn: listarConcorrentes });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Inteligência Competitiva</h1>
        <p className="text-sm text-ink-500">
          Concorrentes identificados a partir do detalhamento de derrota registrado nas participações.
        </p>
      </div>

      {concorrentesQuery.data?.length === 0 && (
        <Card>
          <CardContent className="text-sm text-ink-500">
            Nenhum concorrente identificado ainda. Ao marcar uma participação como "Não vencedora", registre o
            concorrente vencedor para alimentar esta análise.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {concorrentesQuery.data?.map((concorrente) => (
          <Link key={concorrente.chave} to={`/concorrentes/${concorrente.chave}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-gold-600">
                    <Swords className="h-4 w-4 shrink-0" />
                  </div>
                  <Badge tone="warning">{concorrente.totalDisputas} disputas</Badge>
                </div>
                <p className="line-clamp-2 text-sm font-semibold text-ink-900">{concorrente.nome}</p>
                {concorrente.cnpj && <p className="text-xs text-ink-500">{concorrente.cnpj}</p>}
                <p className="text-xs text-ink-500">
                  {concorrente.clientesAfetados} cliente(s) afetado(s) · diferença média{" "}
                  {concorrente.valorMedioPercentualDiferenca !== null
                    ? `${concorrente.valorMedioPercentualDiferenca}%`
                    : "—"}
                </p>
                {concorrente.ultimaDisputaEm && (
                  <p className="text-xs text-ink-400">
                    Última disputa: {new Date(concorrente.ultimaDisputaEm).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
