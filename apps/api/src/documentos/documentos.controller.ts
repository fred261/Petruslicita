import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { z } from "zod";
import { STAFF_ROLES, TAMANHO_MAXIMO_DOCUMENTO_BYTES } from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { DocumentosService } from "./documentos.service";

const uploadMetaSchema = z.object({
  tipo: z.string().min(1),
  dataEmissao: z.string().optional(),
  dataValidade: z.string().optional(),
  clienteId: z.string().optional(),
  participacaoId: z.string().optional(),
});

@Controller("documentos")
@Roles(...STAFF_ROLES)
export class DocumentosController {
  constructor(private documentosService: DocumentosService) {}

  @Post()
  @UseInterceptors(FileInterceptor("arquivo", { limits: { fileSize: TAMANHO_MAXIMO_DOCUMENTO_BYTES } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    const resultado = uploadMetaSchema.safeParse(body);
    if (!resultado.success) {
      throw new BadRequestException({
        message: "Dados inválidos",
        issues: resultado.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    if (!file) {
      throw new BadRequestException("Arquivo é obrigatório.");
    }
    return this.documentosService.upload(resultado.data, file, autor);
  }

  @Get()
  listar(
    @Query("clienteId") clienteId: string | undefined,
    @Query("participacaoId") participacaoId: string | undefined,
    @CurrentUser() autor: AuthenticatedUser,
  ) {
    return this.documentosService.listar({ clienteId, participacaoId }, autor);
  }

  @Get(":id/download")
  async download(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser, @Res() res: Response) {
    const arquivo = await this.documentosService.buscarArquivo(id, autor);
    res.set({
      "Content-Type": arquivo.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(arquivo.nomeArquivo)}"`,
    });
    res.send(arquivo.buffer);
  }

  @Delete(":id")
  @Roles("MASTER", "ADMIN")
  async remover(@Param("id") id: string, @CurrentUser() autor: AuthenticatedUser) {
    await this.documentosService.remover(id, autor);
    return { ok: true };
  }
}
