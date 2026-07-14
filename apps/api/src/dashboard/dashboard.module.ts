import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { RelatoriosExportacaoService } from "./relatorios-exportacao.service";

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, RelatoriosExportacaoService],
})
export class DashboardModule {}
