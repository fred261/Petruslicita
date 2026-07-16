import { Module } from "@nestjs/common";
import { ParticipacoesController } from "./participacoes.controller";
import { ParticipacoesService } from "./participacoes.service";
import { LicitacoesModule } from "../licitacoes/licitacoes.module";

@Module({
  imports: [LicitacoesModule],
  controllers: [ParticipacoesController],
  providers: [ParticipacoesService],
  exports: [ParticipacoesService],
})
export class ParticipacoesModule {}
