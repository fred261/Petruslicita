import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ConsolidadoResponse,
  FiltroDashboardInput,
  FunilResponse,
  IndicadoresClienteResponse,
  Role,
  StatusParticipacao,
} from "@petrus/shared";
import { FASE_FUNIL, FASE_FUNIL_POR_STATUS } from "@petrus/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface Autor {
  userId: string;
  papel: Role;
}

/** Status que representam uma disputa já decidida (vitória ou derrota/desistência). */
const STATUS_DECIDIDOS: StatusParticipacao[] = ["VENCEDORA", "HOMOLOGADA", "CONTRATADA", "NAO_VENCEDORA", "DESCARTADA"];
const STATUS_GANHOS: StatusParticipacao[] = ["VENCEDORA", "HOMOLOGADA", "CONTRATADA"];
const STATUS_ATIVOS: StatusParticipacao[] = [
  "SUGERIDA",
  "EM_ANALISE",
  "EM_PREPARACAO",
  "ENVIADA",
  "EM_DISPUTA",
  "HABILITACAO",
  "RECURSAL",
];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async funil(filtro: FiltroDashboardInput, autor: Autor): Promise<FunilResponse> {
    const where = await this.construirWhere(filtro, autor);
    const participacoes = await this.prisma.participacao.findMany({ where, select: { status: true } });
    return this.montarFunil(participacoes.map((p) => p.status as StatusParticipacao));
  }

  async indicadoresPorCliente(clienteId: string, autor: Autor): Promise<IndicadoresClienteResponse> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new NotFoundException("Cliente não encontrado.");
    await this.garantirAcessoCliente(clienteId, autor);

    const participacoes = await this.prisma.participacao.findMany({
      where: { clienteId },
      include: { contrato: true },
    });

    return this.montarIndicadoresCliente(cliente.id, cliente.razaoSocial, participacoes);
  }

  async consolidado(filtro: FiltroDashboardInput, autor: Autor): Promise<ConsolidadoResponse> {
    const where = await this.construirWhere(filtro, autor);
    const participacoes = await this.prisma.participacao.findMany({
      where,
      include: { contrato: true, cliente: { select: { id: true, razaoSocial: true } } },
    });

    const funil = this.montarFunil(participacoes.map((p) => p.status as StatusParticipacao));

    const porCliente = new Map<string, { razaoSocial: string; participacoes: typeof participacoes }>();
    for (const p of participacoes) {
      const atual = porCliente.get(p.clienteId) ?? { razaoSocial: p.cliente.razaoSocial, participacoes: [] };
      atual.participacoes.push(p);
      porCliente.set(p.clienteId, atual);
    }

    const rankingClientes = Array.from(porCliente.entries())
      .map(([clienteId, dados]) => {
        const indicadores = this.montarIndicadoresCliente(clienteId, dados.razaoSocial, dados.participacoes);
        return {
          clienteId,
          clienteRazaoSocial: dados.razaoSocial,
          totalParticipacoes: indicadores.totalParticipacoes,
          valorTotalContratado: indicadores.valorTotalContratado,
          taxaSucesso: indicadores.taxaSucesso,
        };
      })
      .sort((a, b) => b.valorTotalContratado - a.valorTotalContratado);

    const decididas = participacoes.filter((p) => STATUS_DECIDIDOS.includes(p.status as StatusParticipacao));
    const ganhas = participacoes.filter((p) => STATUS_GANHOS.includes(p.status as StatusParticipacao));
    const contratos = participacoes.map((p) => p.contrato).filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      totalClientes: porCliente.size,
      totalParticipacoes: participacoes.length,
      participacoesAtivas: participacoes.filter((p) => STATUS_ATIVOS.includes(p.status as StatusParticipacao)).length,
      taxaSucesso: decididas.length > 0 ? this.arredondar((ganhas.length / decididas.length) * 100) : null,
      valorTotalContratado: this.arredondar(contratos.reduce((soma, c) => soma + Number(c.valorFinal), 0)),
      contratosAtivos: contratos.filter((c) => c.status === "ATIVO").length,
      funil,
      rankingClientes,
    };
  }

  private montarIndicadoresCliente(
    clienteId: string,
    clienteRazaoSocial: string,
    participacoes: {
      status: string;
      valorProposto: unknown;
      contrato: { valorFinal: unknown; status: string } | null;
    }[],
  ): IndicadoresClienteResponse {
    const decididas = participacoes.filter((p) => STATUS_DECIDIDOS.includes(p.status as StatusParticipacao));
    const ganhas = participacoes.filter((p) => STATUS_GANHOS.includes(p.status as StatusParticipacao));
    const contratos = participacoes.map((p) => p.contrato).filter((c): c is NonNullable<typeof c> => c !== null);

    return {
      clienteId,
      clienteRazaoSocial,
      totalParticipacoes: participacoes.length,
      participacoesAtivas: participacoes.filter((p) => STATUS_ATIVOS.includes(p.status as StatusParticipacao)).length,
      vencidas: participacoes.filter((p) => STATUS_GANHOS.includes(p.status as StatusParticipacao)).length,
      naoVencidas: participacoes.filter((p) => p.status === "NAO_VENCEDORA").length,
      descartadas: participacoes.filter((p) => p.status === "DESCARTADA").length,
      taxaSucesso: decididas.length > 0 ? this.arredondar((ganhas.length / decididas.length) * 100) : null,
      valorTotalProposto: this.arredondar(
        participacoes.reduce((soma, p) => soma + (p.valorProposto ? Number(p.valorProposto) : 0), 0),
      ),
      valorTotalContratado: this.arredondar(contratos.reduce((soma, c) => soma + Number(c.valorFinal), 0)),
      contratosAtivos: contratos.filter((c) => c.status === "ATIVO").length,
    };
  }

  private montarFunil(statusList: StatusParticipacao[]): FunilResponse {
    const porFase = new Map<string, Record<string, number>>(FASE_FUNIL.map((f) => [f, {}]));
    for (const status of statusList) {
      const fase = FASE_FUNIL_POR_STATUS[status];
      const contagem = porFase.get(fase)!;
      contagem[status] = (contagem[status] ?? 0) + 1;
    }

    const fases = FASE_FUNIL.map((fase) => {
      const porStatus = porFase.get(fase)!;
      const total = Object.values(porStatus).reduce((a, b) => a + b, 0);
      return { fase, total, porStatus: porStatus as Record<StatusParticipacao, number> };
    });

    const decididas = statusList.filter((s) => STATUS_DECIDIDOS.includes(s));
    const ganhas = statusList.filter((s) => STATUS_GANHOS.includes(s));

    return {
      totalGeral: statusList.length,
      fases,
      taxaSucesso: decididas.length > 0 ? this.arredondar((ganhas.length / decididas.length) * 100) : null,
    };
  }

  private async construirWhere(filtro: FiltroDashboardInput, autor: Autor): Promise<Prisma.ParticipacaoWhereInput> {
    const where: Prisma.ParticipacaoWhereInput = {};
    if (filtro.clienteId) where.clienteId = filtro.clienteId;
    if (filtro.responsavelId) where.responsavelId = filtro.responsavelId;
    if (filtro.dataInicio || filtro.dataFim) {
      where.criadoEm = {
        ...(filtro.dataInicio ? { gte: new Date(filtro.dataInicio) } : {}),
        ...(filtro.dataFim ? { lte: new Date(filtro.dataFim) } : {}),
      };
    }

    if (autor.papel === "OPERADOR") {
      if (filtro.clienteId) {
        await this.garantirAcessoCliente(filtro.clienteId, autor);
      } else {
        where.cliente = { usuarios: { some: { usuarioId: autor.userId } } };
      }
    }

    return where;
  }

  private async garantirAcessoCliente(clienteId: string, autor: Autor): Promise<void> {
    if (autor.papel === "MASTER" || autor.papel === "ADMIN") return;
    const vinculo = await this.prisma.usuarioCliente.findUnique({
      where: { usuarioId_clienteId: { usuarioId: autor.userId, clienteId } },
    });
    if (!vinculo) throw new ForbiddenException("Você não tem acesso a este cliente.");
  }

  private arredondar(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}
