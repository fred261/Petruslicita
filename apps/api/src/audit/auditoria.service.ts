import { Injectable } from "@nestjs/common";
import type {
  AccessLogResponse,
  AplicarRetencaoResponse,
  AuditLogResponse,
  FiltroAccessLogInput,
  FiltroAuditLogInput,
} from "@petrus/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ConfiguracaoService } from "../prazos/configuracao.service";

const LIMITE_PADRAO = 100;

@Injectable()
export class AuditoriaService {
  constructor(
    private prisma: PrismaService,
    private configuracao: ConfiguracaoService,
  ) {}

  async listarAuditLog(filtro: FiltroAuditLogInput): Promise<AuditLogResponse[]> {
    const where: Prisma.AuditLogWhereInput = {};
    if (filtro.entidade) where.entidade = filtro.entidade;
    if (filtro.usuarioId) where.usuarioId = filtro.usuarioId;
    if (filtro.dataInicio || filtro.dataFim) {
      where.criadoEm = {
        ...(filtro.dataInicio ? { gte: new Date(filtro.dataInicio) } : {}),
        ...(filtro.dataFim ? { lte: new Date(filtro.dataFim) } : {}),
      };
    }

    const registros = await this.prisma.auditLog.findMany({
      where,
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
      take: filtro.limite ?? LIMITE_PADRAO,
    });

    return registros.map((r) => ({
      id: r.id,
      usuarioId: r.usuarioId,
      usuarioNome: r.usuario?.nome ?? null,
      entidade: r.entidade,
      entidadeId: r.entidadeId,
      acao: r.acao,
      dadosAntes: r.dadosAntes,
      dadosDepois: r.dadosDepois,
      criadoEm: r.criadoEm.toISOString(),
    }));
  }

  async listarAccessLog(filtro: FiltroAccessLogInput): Promise<AccessLogResponse[]> {
    const where: Prisma.AccessLogWhereInput = {};
    if (filtro.usuarioId) where.usuarioId = filtro.usuarioId;
    if (filtro.sucesso !== undefined) where.sucesso = filtro.sucesso;
    if (filtro.dataInicio || filtro.dataFim) {
      where.criadoEm = {
        ...(filtro.dataInicio ? { gte: new Date(filtro.dataInicio) } : {}),
        ...(filtro.dataFim ? { lte: new Date(filtro.dataFim) } : {}),
      };
    }

    const registros = await this.prisma.accessLog.findMany({
      where,
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
      take: filtro.limite ?? LIMITE_PADRAO,
    });

    return registros.map((r) => ({
      id: r.id,
      usuarioId: r.usuarioId,
      usuarioNome: r.usuario?.nome ?? null,
      email: r.email,
      ip: r.ip,
      userAgent: r.userAgent,
      sucesso: r.sucesso,
      motivo: r.motivo,
      criadoEm: r.criadoEm.toISOString(),
    }));
  }

  /** LGPD: purga logs mais antigos que a política de retenção configurada. Ação explícita do Master. */
  async aplicarRetencao(): Promise<AplicarRetencaoResponse> {
    const config = await this.configuracao.obter();
    const limite = new Date(Date.now() - config.retencaoAuditoriaDias * 24 * 60 * 60 * 1000);

    const [auditLogs, accessLogs] = await Promise.all([
      this.prisma.auditLog.deleteMany({ where: { criadoEm: { lt: limite } } }),
      this.prisma.accessLog.deleteMany({ where: { criadoEm: { lt: limite } } }),
    ]);

    return { auditLogsRemovidos: auditLogs.count, accessLogsRemovidos: accessLogs.count };
  }
}
