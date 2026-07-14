import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AtualizarModeloDocumentoInput,
  CriarModeloDocumentoInput,
  ModeloDocumentoResponse,
} from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ModelosDocumentoService {
  constructor(private prisma: PrismaService) {}

  async criar(input: CriarModeloDocumentoInput): Promise<ModeloDocumentoResponse> {
    const existente = await this.prisma.modeloDocumento.findUnique({ where: { nome: input.nome } });
    if (existente) throw new ConflictException("Já existe um modelo com este nome.");

    const modelo = await this.prisma.modeloDocumento.create({
      data: {
        nome: input.nome,
        categoria: input.categoria ?? null,
        validadeEmDiasPadrao: input.validadeEmDiasPadrao ?? null,
      },
    });
    return this.paraResposta(modelo);
  }

  async listar(): Promise<ModeloDocumentoResponse[]> {
    const modelos = await this.prisma.modeloDocumento.findMany({ orderBy: { nome: "asc" } });
    return modelos.map((m) => this.paraResposta(m));
  }

  async atualizar(id: string, input: AtualizarModeloDocumentoInput): Promise<ModeloDocumentoResponse> {
    const existente = await this.prisma.modeloDocumento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException("Modelo não encontrado.");

    const modelo = await this.prisma.modeloDocumento.update({ where: { id }, data: input });
    return this.paraResposta(modelo);
  }

  private paraResposta(modelo: {
    id: string;
    nome: string;
    categoria: string | null;
    validadeEmDiasPadrao: number | null;
    ativo: boolean;
  }): ModeloDocumentoResponse {
    return {
      id: modelo.id,
      nome: modelo.nome,
      categoria: modelo.categoria,
      validadeEmDiasPadrao: modelo.validadeEmDiasPadrao,
      ativo: modelo.ativo,
    };
  }
}
