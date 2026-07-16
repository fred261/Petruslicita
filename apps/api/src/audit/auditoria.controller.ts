import { Controller, Get, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { filtroAccessLogSchema, filtroAuditLogSchema } from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuditoriaService } from "./auditoria.service";

@Controller("auditoria")
@Roles("MASTER")
export class AuditoriaController {
  constructor(private auditoriaService: AuditoriaService) {}

  @Get("log")
  listarAuditLog(
    @Query(new ZodValidationPipe(filtroAuditLogSchema)) filtro: z.infer<typeof filtroAuditLogSchema>,
  ) {
    return this.auditoriaService.listarAuditLog(filtro);
  }

  @Get("acessos")
  listarAccessLog(
    @Query(new ZodValidationPipe(filtroAccessLogSchema)) filtro: z.infer<typeof filtroAccessLogSchema>,
  ) {
    return this.auditoriaService.listarAccessLog(filtro);
  }

  @Post("aplicar-retencao")
  aplicarRetencao() {
    return this.auditoriaService.aplicarRetencao();
  }
}
