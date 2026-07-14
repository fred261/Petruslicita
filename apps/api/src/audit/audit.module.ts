import { Global, Module } from "@nestjs/common";
import { PrazosModule } from "../prazos/prazos.module";
import { AuditService } from "./audit.service";
import { AuditoriaController } from "./auditoria.controller";
import { AuditoriaService } from "./auditoria.service";

@Global()
@Module({
  imports: [PrazosModule],
  controllers: [AuditoriaController],
  providers: [AuditService, AuditoriaService],
  exports: [AuditService],
})
export class AuditModule {}
