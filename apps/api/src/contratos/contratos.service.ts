import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AtualizarContratoInput,
  ContratoResponse,
  CriarContratoInput,
  CriarItemCronogramaInput,
  ItemCronogramaResponse,
  Role,
} from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EventosService } from "../eventos/eventos.service";

interface Autor {
  userId: string;
  papel: Role;
}

@Injectable()
export class ContratosService {
  constructor(
    private prisma: PrismaService,
    private eventos: EventosService,
  ) {}

  async criar(participacaoId: string, input: CriarContratoInput, autor: Autor): Promise<ContratoResponse> {
    const participacao = await this.buscarParticipacaoComAcesso(participacaoId, autor);
    if (participacao.status !== "CONTRATADA") {
      throw new BadRequestException("Só é possível registrar contrato para participações contratadas.");
    }

    const existente = await this.prisma.contrato.findUnique({ where: { participacaoId } });
    if (existente) {
      throw new ConflictException("Esta participação já tem um contrato registrado.");
    }

    const contrato = await this.prisma.contrato.create({
      data: {
        participacaoId,
        numero: input.numero,
        valorFinal: input.valorFinal,
        vigenciaInicio: new Date(input.vigenciaInicio),
        vigenciaFim: new Date(input.vigenciaFim),
        observacoes: input.observacoes ?? null,
      },
      include: { cronograma: true },
    });

    await this.eventos.registrar({
      tipo: "CONTRATO_CRIADO",
      descricao: `Contrato ${contrato.numero} registrado.`,
      autorId: autor.userId,
      participacaoId,
      licitacaoId: participacao.licitacaoId,
    });

    return this.paraResposta(contrato);
  }

  async buscarPorParticipacao(participacaoId: string, autor: Autor): Promise<ContratoResponse | null> {
    await this.buscarParticipacaoComAcesso(participacaoId, autor);
    const contrato = await this.prisma.contrato.findUnique({
      where: { participacaoId },
      include: { cronograma: { orderBy: { dataPrevista: "asc" } } },
    });
    return contrato ? this.paraResposta(contrato) : null;
  }

  async atualizar(id: string, input: AtualizarContratoInput, autor: Autor): Promise<ContratoResponse> {
    const contrato = await this.prisma.contrato.findUnique({ where: { id } });
    if (!contrato) throw new NotFoundException("Contrato não encontrado.");
    await this.buscarParticipacaoComAcesso(contrato.participacaoId, autor);

    const atualizado = await this.prisma.contrato.update({
      where: { id },
      data: {
        numero: input.numero,
        valorFinal: input.valorFinal,
        vigenciaInicio: input.vigenciaInicio ? new Date(input.vigenciaInicio) : undefined,
        vigenciaFim: input.vigenciaFim ? new Date(input.vigenciaFim) : undefined,
        status: input.status,
        observacoes: input.observacoes,
      },
      include: { cronograma: { orderBy: { dataPrevista: "asc" } } },
    });

    return this.paraResposta(atualizado);
  }

  async adicionarItemCronograma(
    contratoId: string,
    input: CriarItemCronogramaInput,
    autor: Autor,
  ): Promise<ItemCronogramaResponse> {
    const contrato = await this.prisma.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato) throw new NotFoundException("Contrato não encontrado.");
    await this.buscarParticipacaoComAcesso(contrato.participacaoId, autor);

    const item = await this.prisma.itemCronograma.create({
      data: {
        contratoId,
        tipo: input.tipo,
        descricao: input.descricao,
        dataPrevista: new Date(input.dataPrevista),
        valorPrevisto: input.valorPrevisto ?? null,
      },
    });
    return this.itemParaResposta(item);
  }

  async marcarConcluido(itemId: string, concluido: boolean, autor: Autor): Promise<ItemCronogramaResponse> {
    const item = await this.prisma.itemCronograma.findUnique({
      where: { id: itemId },
      include: { contrato: true },
    });
    if (!item) throw new NotFoundException("Item de cronograma não encontrado.");
    await this.buscarParticipacaoComAcesso(item.contrato.participacaoId, autor);

    const atualizado = await this.prisma.itemCronograma.update({
      where: { id: itemId },
      data: { concluido, dataConclusao: concluido ? new Date() : null },
    });
    return this.itemParaResposta(atualizado);
  }

  private async buscarParticipacaoComAcesso(participacaoId: string, autor: Autor) {
    const participacao = await this.prisma.participacao.findUnique({ where: { id: participacaoId } });
    if (!participacao) throw new NotFoundException("Participação não encontrada.");

    if (autor.papel !== "MASTER" && autor.papel !== "ADMIN") {
      const vinculo = await this.prisma.usuarioCliente.findUnique({
        where: { usuarioId_clienteId: { usuarioId: autor.userId, clienteId: participacao.clienteId } },
      });
      if (!vinculo) throw new ForbiddenException("Você não tem acesso a esta participação.");
    }

    return participacao;
  }

  private paraResposta(contrato: {
    id: string;
    participacaoId: string;
    numero: string;
    valorFinal: unknown;
    vigenciaInicio: Date;
    vigenciaFim: Date;
    status: string;
    observacoes: string | null;
    cronograma: {
      id: string;
      tipo: string;
      descricao: string;
      dataPrevista: Date;
      valorPrevisto: unknown;
      concluido: boolean;
      dataConclusao: Date | null;
    }[];
    criadoEm: Date;
  }): ContratoResponse {
    return {
      id: contrato.id,
      participacaoId: contrato.participacaoId,
      numero: contrato.numero,
      valorFinal: Number(contrato.valorFinal),
      vigenciaInicio: contrato.vigenciaInicio.toISOString(),
      vigenciaFim: contrato.vigenciaFim.toISOString(),
      status: contrato.status as ContratoResponse["status"],
      observacoes: contrato.observacoes,
      cronograma: contrato.cronograma.map((i) => this.itemParaResposta(i)),
      criadoEm: contrato.criadoEm.toISOString(),
    };
  }

  private itemParaResposta(item: {
    id: string;
    tipo: string;
    descricao: string;
    dataPrevista: Date;
    valorPrevisto: unknown;
    concluido: boolean;
    dataConclusao: Date | null;
  }): ItemCronogramaResponse {
    return {
      id: item.id,
      tipo: item.tipo as ItemCronogramaResponse["tipo"],
      descricao: item.descricao,
      dataPrevista: item.dataPrevista.toISOString(),
      valorPrevisto: item.valorPrevisto ? Number(item.valorPrevisto) : null,
      concluido: item.concluido,
      dataConclusao: item.dataConclusao?.toISOString() ?? null,
    };
  }
}
