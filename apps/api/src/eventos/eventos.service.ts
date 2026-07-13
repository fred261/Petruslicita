import { Injectable } from "@nestjs/common";
import type { EventoResponse } from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";

interface RegistrarEventoParams {
  tipo: string;
  descricao: string;
  autorId?: string | null;
  anexoUrl?: string | null;
  licitacaoId?: string;
  participacaoId?: string;
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

  async listarPorLicitacao(licitacaoId: string): Promise<EventoResponse[]> {
    const eventos = await this.prisma.evento.findMany({
      where: { licitacaoId },
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
