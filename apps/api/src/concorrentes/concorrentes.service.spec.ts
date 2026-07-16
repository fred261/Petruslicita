import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ConcorrentesService } from "./concorrentes.service";

const master = { userId: "master_1", papel: "MASTER" as const };
const operador = { userId: "op_1", papel: "OPERADOR" as const };

function disputaFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "part_1",
    clienteId: "cliente_1",
    licitacaoId: "lic_1",
    concorrenteVencedorNome: "Concorrente Ltda",
    concorrenteVencedorCnpj: "11222333000144",
    valorPropostaVencedora: "260000",
    valorProposto: "280000",
    diferencaPercentualVencedora: "-7.14",
    dataDecisao: new Date("2026-01-05"),
    cliente: { id: "cliente_1", razaoSocial: "Cliente Teste" },
    licitacao: {
      id: "lic_1",
      numeroProcesso: "001",
      orgaoNome: "Órgão",
      objeto: "Objeto",
      modalidadeNome: "Pregão Eletrônico",
    },
    ...overrides,
  };
}

function criarService(disputas: ReturnType<typeof disputaFixture>[]) {
  const prisma = {
    participacao: { findMany: vi.fn().mockResolvedValue(disputas) },
  };
  return { service: new ConcorrentesService(prisma as never), prisma };
}

describe("ConcorrentesService.listar", () => {
  it("agrupa disputas pelo mesmo CNPJ em um único concorrente, mesmo com nomes diferentes", async () => {
    const { service } = criarService([
      disputaFixture({ id: "p1", concorrenteVencedorNome: "Concorrente Ltda", clienteId: "c1" }),
      disputaFixture({ id: "p2", concorrenteVencedorNome: "CONCORRENTE LTDA (nome alterado)", clienteId: "c2" }),
    ]);

    const resultado = await service.listar(master);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].totalDisputas).toBe(2);
    expect(resultado[0].clientesAfetados).toBe(2);
  });

  it("agrupa por nome normalizado (case-insensitive) quando não há CNPJ", async () => {
    const { service } = criarService([
      disputaFixture({ id: "p1", concorrenteVencedorCnpj: null, concorrenteVencedorNome: "Sem Cnpj Ltda" }),
      disputaFixture({ id: "p2", concorrenteVencedorCnpj: null, concorrenteVencedorNome: "SEM CNPJ LTDA" }),
    ]);

    const resultado = await service.listar(master);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].totalDisputas).toBe(2);
  });

  it("não mistura concorrentes com CNPJs diferentes mesmo com nomes parecidos", async () => {
    const { service } = criarService([
      disputaFixture({ id: "p1", concorrenteVencedorCnpj: "11111111000111" }),
      disputaFixture({ id: "p2", concorrenteVencedorCnpj: "22222222000122" }),
    ]);

    const resultado = await service.listar(master);

    expect(resultado).toHaveLength(2);
  });

  it("calcula a média da diferença percentual entre as disputas do grupo", async () => {
    const { service } = criarService([
      disputaFixture({ id: "p1", diferencaPercentualVencedora: "-10" }),
      disputaFixture({ id: "p2", diferencaPercentualVencedora: "-4" }),
    ]);

    const resultado = await service.listar(master);

    expect(resultado[0].valorMedioPercentualDiferenca).toBe(-7);
  });

  it("Operador só busca disputas dos clientes aos quais está vinculado", async () => {
    const { service, prisma } = criarService([]);

    await service.listar(operador);

    expect(prisma.participacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cliente: { usuarios: { some: { usuarioId: operador.userId } } },
        }),
      }),
    );
  });

  it("Master não tem filtro de cliente na consulta", async () => {
    const { service, prisma } = criarService([]);

    await service.listar(master);

    expect(prisma.participacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "NAO_VENCEDORA", concorrenteVencedorNome: { not: null } },
      }),
    );
  });
});

describe("ConcorrentesService.detalhar", () => {
  it("decodifica a chave e retorna o histórico completo de disputas do concorrente", async () => {
    const { service } = criarService([disputaFixture()]);
    const [resumo] = await service.listar(master);

    const detalhe = await service.detalhar(resumo.chave, master);

    expect(detalhe.disputas).toHaveLength(1);
    expect(detalhe.disputas[0].clienteRazaoSocial).toBe("Cliente Teste");
    expect(detalhe.valorTotalPropostasVencedoras).toBe(260000);
  });

  it("lança NotFoundException para uma chave que não corresponde a nenhuma disputa", async () => {
    const { service } = criarService([disputaFixture()]);
    const chaveInexistente = Buffer.from("cnpj:00000000000000", "utf8").toString("base64url");

    await expect(service.detalhar(chaveInexistente, master)).rejects.toThrow(NotFoundException);
  });
});
