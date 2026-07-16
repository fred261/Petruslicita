import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { atualizarModeloDocumentoSchema, criarModeloDocumentoSchema, STAFF_ROLES } from "@petrus/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ModelosDocumentoService } from "./modelos-documento.service";

@Controller("modelos-documento")
@Roles(...STAFF_ROLES)
export class ModelosDocumentoController {
  constructor(private modelosService: ModelosDocumentoService) {}

  @Get()
  listar() {
    return this.modelosService.listar();
  }

  @Post()
  @Roles("MASTER", "ADMIN")
  criar(
    @Body(new ZodValidationPipe(criarModeloDocumentoSchema)) body: z.infer<typeof criarModeloDocumentoSchema>,
  ) {
    return this.modelosService.criar(body);
  }

  @Patch(":id")
  @Roles("MASTER", "ADMIN")
  atualizar(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(atualizarModeloDocumentoSchema))
    body: z.infer<typeof atualizarModeloDocumentoSchema>,
  ) {
    return this.modelosService.atualizar(id, body);
  }
}
