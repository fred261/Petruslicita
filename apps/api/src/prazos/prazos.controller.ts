import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { configuracaoSistemaSchema, STAFF_ROLES } from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PrazosService } from "./prazos.service";
import { ConfiguracaoService } from "./configuracao.service";

@Controller("prazos")
@Roles(...STAFF_ROLES)
export class PrazosController {
  constructor(
    private prazosService: PrazosService,
    private configuracaoService: ConfiguracaoService,
  ) {}

  @Get("pendencias")
  pendencias(@CurrentUser() autor: AuthenticatedUser) {
    return this.prazosService.listarPendencias(autor);
  }

  @Post("executar-agora")
  @Roles("MASTER")
  executarAgora() {
    return this.prazosService.executarVerificacao();
  }

  @Get("configuracao")
  @Roles("MASTER")
  obterConfiguracao() {
    return this.configuracaoService.obter();
  }

  @Patch("configuracao")
  @Roles("MASTER")
  atualizarConfiguracao(
    @Body(new ZodValidationPipe(configuracaoSistemaSchema)) body: z.infer<typeof configuracaoSistemaSchema>,
  ) {
    return this.configuracaoService.atualizar(body);
  }
}
