import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { criarParticipacaoSchema, STAFF_ROLES } from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ParticipacoesService } from "./participacoes.service";

@Controller("participacoes")
@Roles(...STAFF_ROLES)
export class ParticipacoesController {
  constructor(private participacoesService: ParticipacoesService) {}

  @Post()
  criar(
    @Body(new ZodValidationPipe(criarParticipacaoSchema)) body: z.infer<typeof criarParticipacaoSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.participacoesService.criar(body, autor);
  }

  @Get()
  listarPorCliente(@Query("clienteId") clienteId: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.participacoesService.listarPorCliente(clienteId, autor);
  }

  @Get("por-licitacao/:licitacaoId")
  @Roles("MASTER", "ADMIN")
  listarPorLicitacao(@Param("licitacaoId") licitacaoId: string) {
    return this.participacoesService.listarPorLicitacao(licitacaoId);
  }
}
