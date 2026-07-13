import type { ClienteDadosApi } from "@petrus/shared";

export interface CnpjLookupAdapter {
  readonly nome: string;
  buscar(cnpjLimpo: string): Promise<ClienteDadosApi>;
}

export class CnpjNaoEncontradoError extends Error {
  constructor(cnpj: string) {
    super(`CNPJ ${cnpj} não encontrado.`);
  }
}

export class CnpjLookupIndisponivelError extends Error {}
