import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentosController } from "./documentos.controller";
import { DocumentosService } from "./documentos.service";
import { ModelosDocumentoController } from "./modelos-documento.controller";
import { ModelosDocumentoService } from "./modelos-documento.service";
import { STORAGE_ADAPTER } from "./documentos.constants";
import { LocalFilesystemAdapter } from "./storage-adapters/local-filesystem.adapter";
import { S3StorageAdapter } from "./storage-adapters/s3.adapter";

@Module({
  controllers: [DocumentosController, ModelosDocumentoController],
  providers: [
    LocalFilesystemAdapter,
    S3StorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      useFactory: (config: ConfigService, s3: S3StorageAdapter, local: LocalFilesystemAdapter) =>
        config.get<string>("S3_BUCKET") ? s3 : local,
      inject: [ConfigService, S3StorageAdapter, LocalFilesystemAdapter],
    },
    DocumentosService,
    ModelosDocumentoService,
  ],
})
export class DocumentosModule {}
