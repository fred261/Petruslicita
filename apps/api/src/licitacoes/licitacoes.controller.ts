import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { z } from "zod";
import {
  buscarLicitacoesFiltroSchema,
  criarLicitacaoManualSchema,
  sincronizarPncpSchema,
  STAFF_ROLES,
} from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { LicitacoesService } from "./licitacoes.service";
import { EventosService } from "../eventos/eventos.service";

const TAMANHO_MAXIMO_PLANILHA_BYTES = 5 * 1024 * 1024;

const adicionarItemManualSchema = z.object({
  numero: z.number().int().positive(),
  descricao: z.string().min(1),
  unidadeMedida: z.string().optional(),
  quantidade: z.number().positive(),
});

@Controller("licitacoes")
@Roles(...STAFF_ROLES)
export class LicitacoesController {
  constructor(
    private licitacoesService: LicitacoesService,
    private eventosService: EventosService,
  ) {}

  @Post("sincronizar-pncp")
  @Roles("MASTER", "ADMIN")
  sincronizarPncp(
    @Body(new ZodValidationPipe(sincronizarPncpSchema)) body: z.infer<typeof sincronizarPncpSchema>,
  ) {
    return this.licitacoesService.sincronizarPncp(body);
  }

  @Post()
  criarManual(
    @Body(new ZodValidationPipe(criarLicitacaoManualSchema))
    body: z.infer<typeof criarLicitacaoManualSchema>,
  ) {
    return this.licitacoesService.criarManual(body);
  }

  @Get()
  listar(@Query(new ZodValidationPipe(buscarLicitacoesFiltroSchema)) filtro: z.infer<typeof buscarLicitacoesFiltroSchema>) {
    return this.licitacoesService.listar(filtro);
  }

  @Get("itens/modelo-planilha")
  async baixarModeloPlanilhaItens(@Res() res: Response) {
    const buffer = await this.licitacoesService.gerarModeloPlanilhaItens();
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-itens-certame.xlsx"',
    });
    res.send(buffer);
  }

  @Get(":id")
  buscar(@Param("id") id: string) {
    return this.licitacoesService.buscarPorId(id);
  }

  @Get(":id/eventos")
  eventos(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.eventosService.listarPorLicitacao(id, autor);
  }

  @Post(":id/atualizar-itens")
  atualizarItens(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    return this.licitacoesService.atualizarItens(id, autor.userId);
  }

  @Post(":id/itens")
  adicionarItemManual(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(adicionarItemManualSchema)) body: z.infer<typeof adicionarItemManualSchema>,
  ) {
    return this.licitacoesService.adicionarItemManual(id, body);
  }

  @Post(":id/itens/importar-planilha")
  @UseInterceptors(FileInterceptor("arquivo", { limits: { fileSize: TAMANHO_MAXIMO_PLANILHA_BYTES } }))
  importarItensPlanilha(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("Arquivo é obrigatório.");
    return this.licitacoesService.importarItensPlanilha(id, file.buffer);
  }
}
