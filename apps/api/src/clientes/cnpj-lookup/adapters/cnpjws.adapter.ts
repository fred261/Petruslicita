import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ClienteDadosApi } from "@petrus/shared";
import {
  CnpjLookupIndisponivelError,
  CnpjNaoEncontradoError,
  type CnpjLookupAdapter,
} from "../cnpj-lookup.types";

interface CnpjWsCnae {
  id: number;
  descricao: string;
}

interface CnpjWsResponse {
  razao_social: string;
  estabelecimento: {
    nome_fantasia: string | null;
    situacao_cadastral: string;
    cnae_fiscal_principal: CnpjWsCnae;
    cnaes_secundarios: CnpjWsCnae[];
    tipo_logradouro: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cep: string | null;
    cidade: { nome: string } | null;
    estado: { sigla: string } | null;
  };
}

/** Fallback para quando a BrasilAPI está fora do ar. */
@Injectable()
export class CnpjWsAdapter implements CnpjLookupAdapter {
  readonly nome = "CNPJ.ws";
  private readonly logger = new Logger(CnpjWsAdapter.name);

  constructor(private config: ConfigService) {}

  async buscar(cnpjLimpo: string): Promise<ClienteDadosApi> {
    const baseUrl = this.config.get<string>("CNPJ_LOOKUP_FALLBACK_URL");
    const url = `${baseUrl}/${cnpjLimpo}`;

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      this.logger.warn(`Falha ao consultar CNPJ.ws: ${(err as Error).message}`);
      throw new CnpjLookupIndisponivelError("CNPJ.ws indisponível.");
    }

    if (response.status === 404) {
      throw new CnpjNaoEncontradoError(cnpjLimpo);
    }
    if (!response.ok) {
      throw new CnpjLookupIndisponivelError(`CNPJ.ws retornou status ${response.status}.`);
    }

    const data = (await response.json()) as CnpjWsResponse;
    const est = data.estabelecimento;
    const logradouroCompleto = [est.tipo_logradouro, est.logradouro].filter(Boolean).join(" ").trim();

    return {
      cnpj: cnpjLimpo,
      razaoSocial: data.razao_social,
      nomeFantasia: est.nome_fantasia,
      cnaePrincipalCodigo: String(est.cnae_fiscal_principal.id),
      cnaePrincipalDescricao: est.cnae_fiscal_principal.descricao,
      cnaesSecundarios: (est.cnaes_secundarios ?? []).map((c) => ({
        codigo: String(c.id),
        descricao: c.descricao,
      })),
      situacaoCadastral: est.situacao_cadastral,
      endereco: {
        logradouro: logradouroCompleto || null,
        numero: est.numero,
        complemento: est.complemento,
        bairro: est.bairro,
        municipio: est.cidade?.nome ?? null,
        uf: est.estado?.sigla ?? null,
        cep: est.cep,
      },
    };
  }
}
