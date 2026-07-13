/**
 * Formatos brutos da API pública de Consulta do PNCP
 * (https://pncp.gov.br/api/consulta/swagger-ui/index.html).
 *
 * IMPORTANTE: mapeados a partir da documentação pública, sem verificação
 * ao vivo (a API do PNCP está bloqueada na rede deste ambiente de build).
 * Confirmar os nomes de campo contra o swagger real antes de ir a produção
 * — se algo estiver diferente, o ajuste fica isolado em `pncp.mapper.ts`.
 */

export interface PncpOrgaoEntidade {
  cnpj: string;
  razaoSocial: string;
  poderId?: string | null;
  esferaId?: string | null;
}

export interface PncpUnidadeOrgao {
  ufSigla: string;
  ufNome?: string | null;
  municipioNome?: string | null;
  codigoUnidade?: string | null;
  nomeUnidade?: string | null;
}

export interface PncpContratacaoItem {
  numeroControlePNCP: string;
  numeroCompra: string;
  anoCompra: number;
  sequencialCompra?: number | null;
  processo: string;
  modalidadeId: number;
  modalidadeNome: string;
  situacaoCompraId?: number | null;
  situacaoCompraNome?: string | null;
  objetoCompra: string;
  orgaoEntidade: PncpOrgaoEntidade;
  unidadeOrgao: PncpUnidadeOrgao;
  valorTotalEstimado?: number | null;
  dataAberturaProposta?: string | null;
  dataEncerramentoProposta?: string | null;
  dataPublicacaoPncp?: string | null;
  linkSistemaOrigem?: string | null;
}

export interface PncpBuscaResponse {
  data: PncpContratacaoItem[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
}

export interface PncpItemCompra {
  numeroItem: number;
  descricao: string;
  unidadeMedida?: string | null;
  quantidade: number;
  valorUnitarioEstimado?: number | null;
  valorTotal?: number | null;
  situacaoCompraItemNome?: string | null;
}
