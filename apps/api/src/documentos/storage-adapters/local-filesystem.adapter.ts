import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { StorageAdapter } from "./storage-adapter.types";
import { ArmazenamentoIndisponivelError } from "./storage-adapter.types";

/** Padrão em dev e quando nenhum bucket S3 está configurado. */
@Injectable()
export class LocalFilesystemAdapter implements StorageAdapter {
  readonly nome = "Disco local";
  private readonly logger = new Logger(LocalFilesystemAdapter.name);
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    this.baseDir = config.get<string>("STORAGE_LOCAL_DIR")!;
  }

  async salvar(chave: string, buffer: Buffer): Promise<void> {
    const caminho = this.caminhoCompleto(chave);
    try {
      await mkdir(path.dirname(caminho), { recursive: true });
      await writeFile(caminho, buffer);
    } catch (err) {
      this.logger.error(`Falha ao salvar ${chave}: ${(err as Error).message}`);
      throw new ArmazenamentoIndisponivelError("Não foi possível salvar o arquivo.");
    }
  }

  async ler(chave: string): Promise<Buffer> {
    try {
      return await readFile(this.caminhoCompleto(chave));
    } catch (err) {
      this.logger.error(`Falha ao ler ${chave}: ${(err as Error).message}`);
      throw new ArmazenamentoIndisponivelError("Não foi possível ler o arquivo.");
    }
  }

  async remover(chave: string): Promise<void> {
    await rm(this.caminhoCompleto(chave), { force: true });
  }

  private caminhoCompleto(chave: string): string {
    const normalizado = path.normalize(chave).replace(/^(\.\.[/\\])+/, "");
    return path.join(this.baseDir, normalizado);
  }
}
