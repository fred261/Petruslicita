import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { exportarRelatorioSchema, filtroDashboardSchema, STAFF_ROLES } from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DashboardService } from "./dashboard.service";
import { RelatoriosExportacaoService } from "./relatorios-exportacao.service";

@Controller("dashboard")
@Roles(...STAFF_ROLES)
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private exportacaoService: RelatoriosExportacaoService,
  ) {}

  @Get("funil")
  funil(
    @Query(new ZodValidationPipe(filtroDashboardSchema)) filtro: z.infer<typeof filtroDashboardSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.dashboardService.funil(filtro, autor);
  }

  @Get("indicadores-cliente/:clienteId")
  indicadoresPorCliente(@Param("clienteId") clienteId: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.dashboardService.indicadoresPorCliente(clienteId, autor);
  }

  @Get("consolidado")
  @Roles("MASTER", "ADMIN")
  consolidado(
    @Query(new ZodValidationPipe(filtroDashboardSchema)) filtro: z.infer<typeof filtroDashboardSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.dashboardService.consolidado(filtro, autor);
  }

  @Get("exportar")
  async exportar(
    @Query(new ZodValidationPipe(exportarRelatorioSchema)) input: z.infer<typeof exportarRelatorioSchema>,
    @CurrentUser() autor: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const relatorio = await this.exportacaoService.gerar(input, autor);
    res.set({
      "Content-Type": relatorio.mimeType,
      "Content-Disposition": `attachment; filename="${relatorio.filename}"`,
    });
    res.send(relatorio.buffer);
  }
}
