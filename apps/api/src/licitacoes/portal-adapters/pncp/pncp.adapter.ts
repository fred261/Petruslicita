import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  BuscarLicitacoesParams,
  BuscarLicitacoesResultado,
  PortalAdapter,
  PortalItemDTO,
  RefLicitacaoExterna,
} from "../portal-adapter.types";
import { PortalIndisponivelError } from "../portal-adapter.types";
import type { PncpBuscaResponse, PncpItemCompra } from "./pncp.types";
import { extrairAnoESequencial, mapContratacaoParaLicitacao, mapItemCompra } from "./pncp.mapper";

const TAMANHO_PAGINA = 50;

@Injectable()
export class PncpAdapter implements PortalAdapter {
  readonly fonte = "PNCP";
  private readonly logger = new Logger(PncpAdapter.name);

  constructor(private config: ConfigService) {}

  async buscarLicitacoes(params: BuscarLicitacoesParams): Promise<BuscarLicitacoesResultado> {
    const baseUrl = this.config.get<string>("PNCP_BASE_URL")!;
    const query = new URLSearchParams({
      dataInicial: params.dataInicial,
      dataFinal: params.dataFinal,
      codigoModalidadeContratacao: params.modalidadeCodigo,
      pagina: String(params.pagina),
      tamanhoPagina: String(TAMANHO_PAGINA),
    });
    if (params.uf) query.set("uf", params.uf);

    const url = `${baseUrl}/v1/contratacoes/publicacao?${query.toString()}`;
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    } catch (err) {
      this.logger.warn(`Falha ao consultar PNCP: ${(err as Error).message}`);
      throw new PortalIndisponivelError("PNCP indisponível no momento.");
    }

    if (!response.ok) {
      throw new PortalIndisponivelError(`PNCP retornou status ${response.status}.`);
    }

    const data = (await response.json()) as PncpBuscaResponse;
    return {
      licitacoes: (data.data ?? []).map(mapContratacaoParaLicitacao),
      totalPaginas: data.totalPaginas ?? 1,
      paginaAtual: data.numeroPagina ?? params.pagina,
    };
  }

  async buscarItens(ref: RefLicitacaoExterna): Promise<PortalItemDTO[]> {
    const baseUrl = this.config.get<string>("PNCP_BASE_URL")!;
    const identificadores = extrairAnoESequencial(ref.idExterno);
    if (!identificadores) {
      throw new PortalIndisponivelError(
        `Não foi possível extrair ano/sequencial de "${ref.idExterno}" para buscar os itens.`,
      );
    }

    const url = `${baseUrl}/v1/orgaos/${ref.orgaoCnpj}/compras/${identificadores.ano}/${identificadores.sequencial}/itens`;
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    } catch (err) {
      this.logger.warn(`Falha ao consultar itens no PNCP: ${(err as Error).message}`);
      throw new PortalIndisponivelError("PNCP indisponível no momento.");
    }

    if (!response.ok) {
      throw new PortalIndisponivelError(`PNCP retornou status ${response.status} ao buscar itens.`);
    }

    const data = (await response.json()) as PncpItemCompra[];
    return data.map(mapItemCompra);
  }
}
