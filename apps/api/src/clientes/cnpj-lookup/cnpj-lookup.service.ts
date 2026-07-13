import { Injectable, Logger } from "@nestjs/common";
import type { ClienteDadosApi } from "@petrus/shared";
import { BrasilApiAdapter } from "./adapters/brasil-api.adapter";
import { CnpjWsAdapter } from "./adapters/cnpjws.adapter";
import { CnpjLookupIndisponivelError, CnpjNaoEncontradoError } from "./cnpj-lookup.types";

/**
 * Orquestra os adaptadores de consulta de CNPJ: tenta a fonte primária e
 * cai para a fonte de fallback se a primeira estiver indisponível.
 * Um CNPJ realmente inexistente (404) não aciona fallback.
 */
@Injectable()
export class CnpjLookupService {
  private readonly logger = new Logger(CnpjLookupService.name);

  constructor(
    private primaria: BrasilApiAdapter,
    private fallback: CnpjWsAdapter,
  ) {}

  async buscar(cnpjLimpo: string): Promise<ClienteDadosApi> {
    try {
      return await this.primaria.buscar(cnpjLimpo);
    } catch (err) {
      if (err instanceof CnpjNaoEncontradoError) {
        throw err;
      }
      this.logger.warn(`Fonte primária (${this.primaria.nome}) falhou, tentando fallback.`);
      try {
        return await this.fallback.buscar(cnpjLimpo);
      } catch (fallbackErr) {
        if (fallbackErr instanceof CnpjNaoEncontradoError) {
          throw fallbackErr;
        }
        throw new CnpjLookupIndisponivelError(
          "Não foi possível consultar o CNPJ em nenhuma fonte disponível no momento.",
        );
      }
    }
  }
}
