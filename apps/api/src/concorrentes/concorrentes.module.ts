import { Module } from "@nestjs/common";
import { ConcorrentesController } from "./concorrentes.controller";
import { ConcorrentesService } from "./concorrentes.service";

@Module({
  controllers: [ConcorrentesController],
  providers: [ConcorrentesService],
})
export class ConcorrentesModule {}
