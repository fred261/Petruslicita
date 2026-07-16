/**
 * Camada de armazenamento plugável — mesmo padrão dos adaptadores de CNPJ,
 * PNCP e e-mail. Local por padrão (testável sem infraestrutura externa);
 * S3-compatível (AWS S3, MinIO) quando configurado, para produção.
 */
export interface StorageAdapter {
  readonly nome: string;
  salvar(chave: string, buffer: Buffer, mimeType: string): Promise<void>;
  ler(chave: string): Promise<Buffer>;
  remover(chave: string): Promise<void>;
}

export class ArmazenamentoIndisponivelError extends Error {}
