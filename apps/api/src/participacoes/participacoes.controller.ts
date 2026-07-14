import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { z } from "zod";
import {
  atualizarPrazoParticipacaoSchema,
  atualizarStatusParticipacaoSchema,
  atualizarValorPropostoSchema,
  criarComentarioSchema,
  criarParticipacaoSchema,
  selecionarItensParticipacaoSchema,
  STAFF_ROLES,
} from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ParticipacoesService } from "./participacoes.service";
import { EventosService } from "../eventos/eventos.service";

@Controller("participacoes")
@Roles(...STAFF_ROLES)
export class ParticipacoesController {
  constructor(
    private participacoesService: ParticipacoesService,
    private eventosService: EventosService,
  ) {}

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

  @Get(":id")
  buscar(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.participacoesService.buscarPorId(id, autor);
  }

  @Get(":id/eventos")
  async eventos(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    await this.participacoesService.buscarPorId(id, autor);
    return this.eventosService.listarPorParticipacao(id);
  }

  @Patch(":id/status")
  atualizarStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(atualizarStatusParticipacaoSchema))
    body: z.infer<typeof atualizarStatusParticipacaoSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.participacoesService.atualizarStatus(id, body, autor);
  }

  @Patch(":id/prazo")
  atualizarPrazo(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(atualizarPrazoParticipacaoSchema))
    body: z.infer<typeof atualizarPrazoParticipacaoSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.participacoesService.atualizarPrazo(id, body, autor);
  }

  @Patch(":id/valor-proposto")
  atualizarValorProposto(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(atualizarValorPropostoSchema))
    body: z.infer<typeof atualizarValorPropostoSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.participacoesService.atualizarValorProposto(id, body, autor);
  }

  @Put(":id/itens")
  selecionarItens(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(selecionarItensParticipacaoSchema))
    body: z.infer<typeof selecionarItensParticipacaoSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.participacoesService.selecionarItens(id, body, autor);
  }

  @Get(":id/comentarios")
  listarComentarios(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.participacoesService.listarComentarios(id, autor);
  }

  @Post(":id/comentarios")
  comentar(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(criarComentarioSchema)) body: z.infer<typeof criarComentarioSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.participacoesService.comentar(id, body, autor);
  }
}
