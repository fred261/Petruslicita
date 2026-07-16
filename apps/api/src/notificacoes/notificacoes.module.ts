import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificacoesService } from "./notificacoes.service";
import { EMAIL_ADAPTER } from "./notificacoes.constants";
import { ConsoleEmailAdapter } from "./email-adapters/console-email.adapter";
import { ResendEmailAdapter } from "./email-adapters/resend-email.adapter";

@Global()
@Module({
  providers: [
    ConsoleEmailAdapter,
    ResendEmailAdapter,
    {
      provide: EMAIL_ADAPTER,
      useFactory: (config: ConfigService, resend: ResendEmailAdapter, console_: ConsoleEmailAdapter) =>
        config.get<string>("RESEND_API_KEY") ? resend : console_,
      inject: [ConfigService, ResendEmailAdapter, ConsoleEmailAdapter],
    },
    NotificacoesService,
  ],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
