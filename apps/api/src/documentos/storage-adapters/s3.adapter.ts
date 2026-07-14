import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StorageAdapter } from "./storage-adapter.types";
import { ArmazenamentoIndisponivelError } from "./storage-adapter.types";

/** Produção — AWS S3 ou compatível (ex.: MinIO), conforme S3_* no .env. */
@Injectable()
export class S3StorageAdapter implements StorageAdapter {
  readonly nome = "S3";
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>("S3_BUCKET")!;
    this.client = new S3Client({
      region: config.get<string>("S3_REGION"),
      endpoint: config.get<string>("S3_ENDPOINT"),
      forcePathStyle: config.get<string>("S3_FORCE_PATH_STYLE") === "true",
      credentials: {
        accessKeyId: config.get<string>("S3_ACCESS_KEY")!,
        secretAccessKey: config.get<string>("S3_SECRET_KEY")!,
      },
    });
  }

  async salvar(chave: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: chave, Body: buffer, ContentType: mimeType }),
      );
    } catch (err) {
      this.logger.error(`Falha ao salvar ${chave} no S3: ${(err as Error).message}`);
      throw new ArmazenamentoIndisponivelError("Não foi possível salvar o arquivo.");
    }
  }

  async ler(chave: string): Promise<Buffer> {
    try {
      const resultado = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: chave }));
      const bytes = await resultado.Body?.transformToByteArray();
      if (!bytes) throw new Error("Corpo vazio.");
      return Buffer.from(bytes);
    } catch (err) {
      this.logger.error(`Falha ao ler ${chave} do S3: ${(err as Error).message}`);
      throw new ArmazenamentoIndisponivelError("Não foi possível ler o arquivo.");
    }
  }

  async remover(chave: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: chave })).catch((err) => {
      this.logger.warn(`Falha ao remover ${chave} do S3: ${(err as Error).message}`);
    });
  }
}
