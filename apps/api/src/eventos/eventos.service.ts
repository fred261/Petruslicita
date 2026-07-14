import { Injectable } from "@nestjs/common";
import type { EventoResponse, Role } from "@petrus/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface RegistrarEventoParams {
  tipo: string;
  descricao: string;
  autorId?: string | null;
  anexoUrl?: string | null;
  licitacaoId?: string;
  participacaoId?: string;
}

interface Autor {
  userId: string;
  papel: Role;
}

/** Histórico imutável de eventos — nunca editado ou removido após criado. */
@Injectable()
export class EventosService {
  constructor(private prisma: PrismaService) {}

  async registrar(params: RegistrarEventoParams): Promise<void> {
    await this.prisma.evento.create({
      data: {
        tipo: params.tipo,
        descricao: params.descricao,
        autorId: params.autorId ?? null,
        anexoUrl: params.anexoUrl ?? null,
        licitacaoId: params.licitacaoId,
        participacaoId: params.participacaoId,
      },
    });
  }

  /**
   * Eventos de uma Licitação incluem tanto eventos de captação (públicos entre
   * clientes) quanto eventos de Participações vinculadas — estes últimos revelam
   * dados de clientes concorrentes (razão social, valor proposto, status), então
   * um Operador só pode vê-los para os clientes aos quais está vinculado. Master/
   * Admin veem tudo (mesmo sigilo aplicado em ParticipacoesService.listarPorLicitacao).
   */
  async listarPorLicitacao(licitacaoId: string, autor: Autor): Promise<EventoResponse[]> {
    const where: Prisma.EventoWhereInput =
      autor.papel === "MASTER" || autor.papel === "ADMIN"
        ? { licitacaoId }
        : {
            licitacaoId,
            OR: [
              { participacaoId: null },
              { participacao: { cliente: { usuarios: { some: { usuarioId: autor.userId } } } } },
            ],
          };

    const eventos = await this.prisma.evento.findMany({
      where,
      include: { autor: true },
      orderBy: { criadoEm: "desc" },
    });
    return eventos.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      descricao: e.descricao,
      autorNome: e.autor?.nome ?? null,
      anexoUrl: e.anexoUrl,
      criadoEm: e.criadoEm.toISOString(),
    }));
  }

  async listarPorParticipacao(participacaoId: string): Promise<EventoResponse[]> {
    const eventos = await this.prisma.evento.findMany({
      where: { participacaoId },
      include: { autor: true },
      orderBy: { criadoEm: "desc" },
    });
    return eventos.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      descricao: e.descricao,
      autorNome: e.autor?.nome ?? null,
      anexoUrl: e.anexoUrl,
      criadoEm: e.criadoEm.toISOString(),
    }));
  }
}
