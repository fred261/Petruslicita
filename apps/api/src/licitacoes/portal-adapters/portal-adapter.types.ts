/**
 * Camada de importação plugável — hoje só o PNCP está implementado, mas o
 * contrato é desenhado para plugar futuros portais municipais/estaduais
 * fora do PNCP sem tocar no restante do módulo de Captação de Editais.
 */

export interface PortalLicitacaoDTO {
  idExterno: string;
  orgaoCnpj: string;
  orgaoNome: string;
  esfera: string | null;
  numeroProcesso: string;
  modalidadeCodigo: string | null;
  modalidadeNome: string;
  objeto: string;
  valorEstimado: number | null;
  uf: string;
  municipio: string | null;
  dataPublicacao: Date | null;
  dataLimiteImpugnacao: Date | null;
  dataLimiteEsclarecimento: Date | null;
  dataSessaoAbertura: Date | null;
  linkEdital: string | null;
  situacao: string | null;
}

export interface PortalItemDTO {
  numero: number;
  descricao: string;
  unidadeMedida: string | null;
  quantidade: number;
  valorUnitarioEstimado: number | null;
  valorTotalEstimado: number | null;
  situacao: string | null;
}

export interface BuscarLicitacoesParams {
  uf?: string;
  modalidadeCodigo: string;
  /** yyyyMMdd */
  dataInicial: string;
  /** yyyyMMdd */
  dataFinal: string;
  pagina: number;
}

export interface BuscarLicitacoesResultado {
  licitacoes: PortalLicitacaoDTO[];
  totalPaginas: number;
  paginaAtual: number;
}

/** Identificadores mínimos para buscar o detalhe de itens de uma licitação já importada. */
export interface RefLicitacaoExterna {
  idExterno: string;
  orgaoCnpj: string;
}

export interface PortalAdapter {
  readonly fonte: string;
  buscarLicitacoes(params: BuscarLicitacoesParams): Promise<BuscarLicitacoesResultado>;
  buscarItens(ref: RefLicitacaoExterna): Promise<PortalItemDTO[]>;
}

export class PortalIndisponivelError extends Error {}
