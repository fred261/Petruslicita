import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import {
  atualizarContratoSchema,
  criarContratoSchema,
  criarItemCronogramaSchema,
  STAFF_ROLES,
} from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ContratosService } from "./contratos.service";

const marcarConcluidoSchema = z.object({ concluido: z.boolean() });

@Controller()
@Roles(...STAFF_ROLES)
export class ContratosController {
  constructor(private contratosService: ContratosService) {}

  @Get("participacoes/:participacaoId/contrato")
  buscar(@Param("participacaoId") participacaoId: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.contratosService.buscarPorParticipacao(participacaoId, autor);
  }

  @Post("participacoes/:participacaoId/contrato")
  criar(
    @Param("participacaoId") participacaoId: string,
    @Body(new ZodValidationPipe(criarContratoSchema)) body: z.infer<typeof criarContratoSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.contratosService.criar(participacaoId, body, autor);
  }

  @Patch("contratos/:id")
  atualizar(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(atualizarContratoSchema)) body: z.infer<typeof atualizarContratoSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.contratosService.atualizar(id, body, autor);
  }

  @Post("contratos/:id/cronograma")
  adicionarItemCronograma(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(criarItemCronogramaSchema)) body: z.infer<typeof criarItemCronogramaSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.contratosService.adicionarItemCronograma(id, body, autor);
  }

  @Patch("contratos/cronograma/:itemId")
  marcarConcluido(
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(marcarConcluidoSchema)) body: z.infer<typeof marcarConcluidoSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.contratosService.marcarConcluido(itemId, body.concluido, autor);
  }
}
