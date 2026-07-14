import { Module, OnModuleInit } from "@nestjs/common";
import { BullModule, InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { PrazosController } from "./prazos.controller";
import { PrazosService } from "./prazos.service";
import { ConfiguracaoService } from "./configuracao.service";
import { PrazosProcessor, FILA_PRAZOS, JOB_VERIFICAR_PRAZOS } from "./prazos.processor";

@Module({
  imports: [BullModule.registerQueue({ name: FILA_PRAZOS })],
  controllers: [PrazosController],
  providers: [PrazosService, ConfiguracaoService, PrazosProcessor],
  exports: [PrazosService, ConfiguracaoService],
})
export class PrazosModule implements OnModuleInit {
  constructor(@InjectQueue(FILA_PRAZOS) private queue: Queue) {}

  /** Agenda o tick recorrente (a cada hora) — idempotente entre reinícios. */
  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      "verificar-prazos-tick",
      { pattern: "0 * * * *" },
      { name: JOB_VERIFICAR_PRAZOS },
    );
  }
}
