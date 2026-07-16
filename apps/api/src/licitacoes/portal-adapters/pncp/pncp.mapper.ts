import type { PortalItemDTO, PortalLicitacaoDTO } from "../portal-adapter.types";
import type { PncpContratacaoItem, PncpItemCompra } from "./pncp.types";

const ESFERA_POR_ID: Record<string, string> = {
  F: "Federal",
  E: "Estadual",
  M: "Municipal",
};

export function mapContratacaoParaLicitacao(item: PncpContratacaoItem): PortalLicitacaoDTO {
  return {
    idExterno: item.numeroControlePNCP,
    orgaoCnpj: item.orgaoEntidade.cnpj,
    orgaoNome: item.orgaoEntidade.razaoSocial,
    esfera: item.orgaoEntidade.esferaId ? (ESFERA_POR_ID[item.orgaoEntidade.esferaId] ?? null) : null,
    numeroProcesso: item.processo,
    modalidadeCodigo: String(item.modalidadeId),
    modalidadeNome: item.modalidadeNome,
    objeto: item.objetoCompra,
    valorEstimado: item.valorTotalEstimado ?? null,
    uf: item.unidadeOrgao.ufSigla,
    municipio: item.unidadeOrgao.municipioNome ?? null,
    dataPublicacao: parseData(item.dataPublicacaoPncp),
    dataLimiteImpugnacao: null,
    dataLimiteEsclarecimento: null,
    dataSessaoAbertura: parseData(item.dataAberturaProposta),
    linkEdital: item.linkSistemaOrigem ?? null,
    situacao: item.situacaoCompraNome ?? null,
  };
}

export function mapItemCompra(item: PncpItemCompra): PortalItemDTO {
  return {
    numero: item.numeroItem,
    descricao: item.descricao,
    unidadeMedida: item.unidadeMedida ?? null,
    quantidade: item.quantidade,
    valorUnitarioEstimado: item.valorUnitarioEstimado ?? null,
    valorTotalEstimado: item.valorTotal ?? null,
    situacao: item.situacaoCompraItemNome ?? null,
  };
}

function parseData(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * O identificador `numeroControlePNCP` segue o formato
 * `{cnpjOrgao}-{seq}-{numeroSequencialCompra}/{anoCompra}`. Para buscar os
 * itens é preciso reconstruir `ano` e `sequencial` — extraídos aqui a partir
 * do próprio identificador para não depender de campos que podem não vir
 * em todas as respostas.
 */
export function extrairAnoESequencial(numeroControlePNCP: string): { ano: number; sequencial: number } | null {
  const match = /-(\d+)\/(\d{4})$/.exec(numeroControlePNCP);
  if (!match) return null;
  return { sequencial: Number(match[1]), ano: Number(match[2]) };
}
