import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import {
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  senhaForteSchema,
  USER_MANAGER_ROLES,
} from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { UsersService } from "./users.service";

const redefinirSenhaSchema = z.object({ novaSenha: senhaForteSchema });

@Controller("usuarios")
@Roles(...USER_MANAGER_ROLES)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  criar(
    @Body(new ZodValidationPipe(criarUsuarioSchema)) body: z.infer<typeof criarUsuarioSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.usersService.criar(body, autor);
  }

  @Get()
  listar(@CurrentUser() autor: AuthenticatedUser) {
    return this.usersService.listar(autor);
  }

  @Get(":id")
  buscar(@Param("id") id: string) {
    return this.usersService.buscarPorId(id);
  }

  @Patch(":id")
  atualizar(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(atualizarUsuarioSchema)) body: z.infer<typeof atualizarUsuarioSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.usersService.atualizar(id, body, autor);
  }

  @Post(":id/redefinir-senha")
  async redefinirSenha(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(redefinirSenhaSchema)) body: z.infer<typeof redefinirSenhaSchema>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    await this.usersService.redefinirSenha(id, body.novaSenha, autor);
    return { ok: true };
  }

  @Delete(":id")
  @Roles("MASTER")
  async excluir(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    await this.usersService.excluir(id, autor);
    return { ok: true };
  }
}
