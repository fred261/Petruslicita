import { Injectable } from "@nestjs/common";
import type { AcaoAuditoria } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface RegistrarParams {
  usuarioId: string | null;
  entidade: string;
  entidadeId: string;
  acao: AcaoAuditoria;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
}

/** Log de auditoria por alteração em entidades sensíveis (quem alterou o quê, quando). */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async registrar(params: RegistrarParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        usuarioId: params.usuarioId,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        acao: params.acao,
        dadosAntes: params.dadosAntes as never,
        dadosDepois: params.dadosDepois as never,
      },
    });
  }
}
