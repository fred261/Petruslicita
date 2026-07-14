import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditModule } from "./audit/audit.module";
import { EventosModule } from "./eventos/eventos.module";
import { NotificacoesModule } from "./notificacoes/notificacoes.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ClientesModule } from "./clientes/clientes.module";
import { LicitacoesModule } from "./licitacoes/licitacoes.module";
import { ParticipacoesModule } from "./participacoes/participacoes.module";
import { PrazosModule } from "./prazos/prazos.module";
import { DocumentosModule } from "./documentos/documentos.module";
import { ContratosModule } from "./contratos/contratos.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>("REDIS_URL")!);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
          },
        };
      },
    }),
    PrismaModule,
    AuditModule,
    EventosModule,
    NotificacoesModule,
    AuthModule,
    UsersModule,
    ClientesModule,
    LicitacoesModule,
    ParticipacoesModule,
    PrazosModule,
    DocumentosModule,
    ContratosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
