import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { buscarConcorrente } from "@/lib/api/concorrentes";

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ConcorrenteFichaPage() {
  const { chave } = useParams<{ chave: string }>();
  const concorrenteQuery = useQuery({
    queryKey: ["concorrente", chave],
    queryFn: () => buscarConcorrente(chave!),
    enabled: !!chave,
  });

  if (!concorrenteQuery.data) return null;
  const concorrente = concorrenteQuery.data;

  return (
    <div className="space-y-6">
      <Link to="/concorrentes" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-ink-900">{concorrente.nome}</h1>
        {concorrente.cnpj && <p className="text-sm text-ink-500">{concorrente.cnpj}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador label="Disputas registradas" valor={concorrente.totalDisputas} />
        <Indicador
          label="Diferença percentual média"
          valor={
            concorrente.valorMedioPercentualDiferenca !== null
              ? `${concorrente.valorMedioPercentualDiferenca}%`
              : "—"
          }
        />
        <Indicador
          label="Total das propostas vencedoras"
          valor={MOEDA.format(concorrente.valorTotalPropostasVencedoras)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de disputas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                <th className="py-1.5 pr-3">Cliente</th>
                <th className="py-1.5 pr-3">Licitação</th>
                <th className="py-1.5 pr-3">Nossa proposta</th>
                <th className="py-1.5 pr-3">Proposta vencedora</th>
                <th className="py-1.5 pr-3">Diferença</th>
                <th className="py-1.5 pr-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {concorrente.disputas.map((d) => (
                <tr key={d.participacaoId} className="border-b border-ink-50">
                  <td className="py-1.5 pr-3 text-ink-900">{d.clienteRazaoSocial}</td>
                  <td className="py-1.5 pr-3 text-ink-500">
                    <Link to={`/participacoes/${d.participacaoId}`} className="hover:text-gold-700">
                      {d.licitacaoNumeroProcesso} — {d.licitacaoObjeto}
                    </Link>
                    <p className="text-xs text-ink-400">
                      {d.licitacaoOrgaoNome} · {d.licitacaoModalidadeNome}
                    </p>
                  </td>
                  <td className="py-1.5 pr-3 text-ink-500">
                    {d.valorProposto !== null ? MOEDA.format(d.valorProposto) : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-ink-500">
                    {d.valorPropostaVencedora !== null ? MOEDA.format(d.valorPropostaVencedora) : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-ink-500">
                    {d.diferencaPercentual !== null ? `${d.diferencaPercentual}%` : "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-ink-500">
                    {d.dataDecisao ? new Date(d.dataDecisao).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Indicador({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-md border border-ink-100 bg-white p-3 shadow-sm">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-lg font-semibold text-ink-900">{valor}</p>
    </div>
  );
}
