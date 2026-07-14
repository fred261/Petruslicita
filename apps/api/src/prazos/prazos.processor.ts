import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { PrazosService } from "./prazos.service";

export const FILA_PRAZOS = "prazos";
export const JOB_VERIFICAR_PRAZOS = "verificar-prazos";

@Processor(FILA_PRAZOS)
export class PrazosProcessor extends WorkerHost {
  private readonly logger = new Logger(PrazosProcessor.name);

  constructor(private prazosService: PrazosService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name !== JOB_VERIFICAR_PRAZOS) return;
    this.logger.log("Executando verificação periódica de prazos...");
    return this.prazosService.executarVerificacao();
  }
}
