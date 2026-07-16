import { Controller, Get, Param } from "@nestjs/common";
import { STAFF_ROLES } from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ConcorrentesService } from "./concorrentes.service";

@Controller("concorrentes")
@Roles(...STAFF_ROLES)
export class ConcorrentesController {
  constructor(private concorrentesService: ConcorrentesService) {}

  @Get()
  listar(@CurrentUser() autor: AuthenticatedUser) {
    return this.concorrentesService.listar(autor);
  }

  @Get(":chave")
  detalhar(@Param("chave") chave: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.concorrentesService.detalhar(chave, autor);
  }
}
