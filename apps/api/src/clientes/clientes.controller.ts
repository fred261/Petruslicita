import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import {
  atualizarClienteCamadaEditavelSchema,
  criarClienteSchema,
  STAFF_ROLES,
} from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ClientesService } from "./clientes.service";

@Controller("clientes")
@Roles(...STAFF_ROLES)
export class ClientesController {
  constructor(private clientesService: ClientesService) {}

  @Post()
  criar(
    @Body(new ZodValidationPipe(criarClienteSchema)) body: z.infer<typeof criarClienteSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.clientesService.criar(body, autor);
  }

  @Get()
  listar(@CurrentUser() autor: AuthenticatedUser) {
    return this.clientesService.listar(autor);
  }

  @Get(":id")
  buscar(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.clientesService.buscarPorId(id, autor);
  }

  @Post(":id/atualizar-dados")
  @Roles("MASTER", "ADMIN")
  atualizarDados(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.clientesService.atualizarDadosApi(id, autor);
  }

  @Patch(":id")
  atualizar(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(atualizarClienteCamadaEditavelSchema))
    body: z.infer<typeof atualizarClienteCamadaEditavelSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.clientesService.atualizarCamadaEditavel(id, body, autor);
  }
}
