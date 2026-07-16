import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DashboardService } from "./dashboard.service";

const master = { userId: "master_1", papel: "MASTER" as const };
const operador = { userId: "op_1", papel: "OPERADOR" as const };

function criarPrismaFake(participacoes: { status: string; clienteId?: string }[]) {
  return {
    participacao: {
      findMany: vi.fn().mockResolvedValue(participacoes),
    },
    usuarioCliente: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    cliente: {
      findUnique: vi.fn().mockResolvedValue({ id: "cli_1", razaoSocial: "Cliente Teste" }),
    },
  };
}

describe("DashboardService.funil", () => {
  it("agrupa participações por fase e calcula a taxa de sucesso apenas sobre disputas decididas", async () => {
    const prisma = criarPrismaFake([
      { status: "SUGERIDA" },
      { status: "EM_DISPUTA" },
      { status: "CONTRATADA" },
      { status: "NAO_VENCEDORA" },
      { status: "DESCARTADA" },
    ]);
    const service = new DashboardService(prisma as never);

    const resultado = await service.funil({}, master);

    expect(resultado.totalGeral).toBe(5);
    // decididas: CONTRATADA, NAO_VENCEDORA, DESCARTADA (3) — ganhas: CONTRATADA (1) => 33.33%
    expect(resultado.taxaSucesso).toBe(33.33);
    const faseCaptacao = resultado.fases.find((f) => f.fase === "CAPTACAO")!;
    expect(faseCaptacao.total).toBe(1);
    const faseForaDoFunil = resultado.fases.find((f) => f.fase === "FORA_DO_FUNIL")!;
    expect(faseForaDoFunil.porStatus.DESCARTADA).toBe(1);
  });

  it("retorna taxaSucesso nula quando não há disputas decididas", async () => {
    const prisma = criarPrismaFake([{ status: "SUGERIDA" }, { status: "EM_DISPUTA" }]);
    const service = new DashboardService(prisma as never);

    const resultado = await service.funil({}, master);

    expect(resultado.taxaSucesso).toBeNull();
  });

  it("Operador sem filtro de cliente tem a consulta restrita aos seus próprios clientes", async () => {
    const prisma = criarPrismaFake([]);
    const service = new DashboardService(prisma as never);

    await service.funil({}, operador);

    expect(prisma.participacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cliente: { usuarios: { some: { usuarioId: operador.userId } } },
        }),
      }),
    );
  });

  it("Operador que filtra por um cliente sem vínculo é bloqueado", async () => {
    const prisma = criarPrismaFake([]);
    const service = new DashboardService(prisma as never);

    await expect(service.funil({ clienteId: "cliente_de_outro" }, operador)).rejects.toThrow(ForbiddenException);
  });

  it("Master não sofre restrição de escopo mesmo sem vínculo em UsuarioCliente", async () => {
    const prisma = criarPrismaFake([]);
    const service = new DashboardService(prisma as never);

    await service.funil({ clienteId: "qualquer_cliente" }, master);

    expect(prisma.usuarioCliente.findUnique).not.toHaveBeenCalled();
    expect(prisma.participacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clienteId: "qualquer_cliente" } }),
    );
  });
});

describe("DashboardService.indicadoresPorCliente", () => {
  it("calcula valor contratado somando apenas os contratos existentes", async () => {
    const prisma = {
      cliente: { findUnique: vi.fn().mockResolvedValue({ id: "cli_1", razaoSocial: "Cliente Teste" }) },
      usuarioCliente: { findUnique: vi.fn().mockResolvedValue(null) },
      participacao: {
        findMany: vi.fn().mockResolvedValue([
          { status: "CONTRATADA", valorProposto: "480000", contrato: { valorFinal: "480000", status: "ATIVO" } },
          { status: "NAO_VENCEDORA", valorProposto: "250000", contrato: null },
          { status: "DESCARTADA", valorProposto: null, contrato: null },
        ]),
      },
    };
    const service = new DashboardService(prisma as never);

    const resultado = await service.indicadoresPorCliente("cli_1", master);

    expect(resultado.totalParticipacoes).toBe(3);
    expect(resultado.vencidas).toBe(1);
    expect(resultado.naoVencidas).toBe(1);
    expect(resultado.descartadas).toBe(1);
    expect(resultado.valorTotalContratado).toBe(480000);
    expect(resultado.valorTotalProposto).toBe(730000);
    expect(resultado.contratosAtivos).toBe(1);
    // decididas: CONTRATADA, NAO_VENCEDORA, DESCARTADA (3) — ganhas: CONTRATADA (1) => 33.33%
    expect(resultado.taxaSucesso).toBe(33.33);
  });
});
