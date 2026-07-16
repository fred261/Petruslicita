import { Module } from "@nestjs/common";
import { LicitacoesController } from "./licitacoes.controller";
import { LicitacoesService } from "./licitacoes.service";
import { PncpAdapter } from "./portal-adapters/pncp/pncp.adapter";
import { MatchingService } from "./matching/matching.service";

@Module({
  controllers: [LicitacoesController],
  providers: [LicitacoesService, PncpAdapter, MatchingService],
  exports: [LicitacoesService, MatchingService],
})
export class LicitacoesModule {}
