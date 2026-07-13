import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ClienteDadosApi } from "@petrus/shared";
import {
  CnpjLookupIndisponivelError,
  CnpjNaoEncontradoError,
  type CnpjLookupAdapter,
} from "../cnpj-lookup.types";

interface BrasilApiCnaeSecundario {
  codigo: number;
  descricao: string;
}

interface BrasilApiResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  descricao_situacao_cadastral: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  cnaes_secundarios: BrasilApiCnaeSecundario[];
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
}

@Injectable()
export class BrasilApiAdapter implements CnpjLookupAdapter {
  readonly nome = "BrasilAPI";
  private readonly logger = new Logger(BrasilApiAdapter.name);

  constructor(private config: ConfigService) {}

  async buscar(cnpjLimpo: string): Promise<ClienteDadosApi> {
    const baseUrl = this.config.get<string>("CNPJ_LOOKUP_PRIMARY_URL");
    const url = `${baseUrl}/${cnpjLimpo}`;

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      this.logger.warn(`Falha ao consultar BrasilAPI: ${(err as Error).message}`);
      throw new CnpjLookupIndisponivelError("BrasilAPI indisponível.");
    }

    if (response.status === 404) {
      throw new CnpjNaoEncontradoError(cnpjLimpo);
    }
    if (!response.ok) {
      throw new CnpjLookupIndisponivelError(`BrasilAPI retornou status ${response.status}.`);
    }

    const data = (await response.json()) as BrasilApiResponse;

    return {
      cnpj: cnpjLimpo,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia,
      cnaePrincipalCodigo: String(data.cnae_fiscal),
      cnaePrincipalDescricao: data.cnae_fiscal_descricao,
      cnaesSecundarios: (data.cnaes_secundarios ?? []).map((c) => ({
        codigo: String(c.codigo),
        descricao: c.descricao,
      })),
      situacaoCadastral: data.descricao_situacao_cadastral,
      endereco: {
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
      },
    };
  }
}
