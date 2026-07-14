import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParticipacoesService } from "./participacoes.service";

const CLIENTE_ID = "cliente_1";
const LICITACAO_ID = "licitacao_1";
const PARTICIPACAO_ID = "part_1";

function participacaoFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: PARTICIPACAO_ID,
    clienteId: CLIENTE_ID,
    licitacaoId: LICITACAO_ID,
    status: "SUGERIDA",
    origem: "MANUAL",
    responsavelId: null,
    observacoes: null,
    proximoPrazo: null,
    valorProposto: null,
    dataDecisao: null,
    motivoPerdaCategoria: null,
    motivoPerdaTexto: null,
    concorrenteVencedorNome: null,
    concorrenteVencedorCnpj: null,
    valorPropostaVencedora: null,
    diferencaPercentualVencedora: null,
    criadoEm: new Date("2026-01-01"),
    cliente: { razaoSocial: "Cliente Teste" },
    licitacao: { orgaoNome: "Órgão", objeto: "Objeto", numeroProcesso: "001" },
    responsavel: null,
    itens: [],
    ...overrides,
  };
}

function criarService(participacaoInicial: ReturnType<typeof participacaoFixture>) {
  const estado = { atual: participacaoInicial };
  const prisma = {
    participacao: {
      findUnique: vi.fn().mockImplementation(() => Promise.resolve(estado.atual)),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        estado.atual = { ...estado.atual, ...data };
        return Promise.resolve(estado.atual);
      }),
    },
    usuarioCliente: {
      findUnique: vi.fn().mockResolvedValue({ usuarioId: "op_1", clienteId: CLIENTE_ID }),
    },
  };
  const eventos = { registrar: vi.fn().mockResolvedValue(undefined) };
  const matching = {};
  const licitacoes = {};
  const service = new ParticipacoesService(prisma as never, eventos as never, matching as never, licitacoes as never);
  return { service, prisma, eventos, estado };
}

const master = { userId: "master_1", papel: "MASTER" as const };
const operadorComAcesso = { userId: "op_1", papel: "OPERADOR" as const };
const operadorSemAcesso = { userId: "op_2", papel: "OPERADOR" as const };

describe("ParticipacoesService.atualizarStatus", () => {
  it("rejeita transição não permitida pela máquina de estados", async () => {
    const { service } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    await expect(service.atualizarStatus(PARTICIPACAO_ID, { status: "CONTRATADA" }, master)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("permite transição válida", async () => {
    const { service } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    const resultado = await service.atualizarStatus(PARTICIPACAO_ID, { status: "EM_ANALISE" }, master);
    expect(resultado.status).toBe("EM_ANALISE");
  });

  it("exige motivo de perda ao marcar DESCARTADA", async () => {
    const { service } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    await expect(service.atualizarStatus(PARTICIPACAO_ID, { status: "DESCARTADA" }, master)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("exige motivo de perda ao marcar NAO_VENCEDORA", async () => {
    const { service } = criarService(participacaoFixture({ status: "HABILITACAO" }));
    await expect(service.atualizarStatus(PARTICIPACAO_ID, { status: "NAO_VENCEDORA" }, master)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("aceita DESCARTADA quando o motivo de perda é informado", async () => {
    const { service } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    const resultado = await service.atualizarStatus(
      PARTICIPACAO_ID,
      { status: "DESCARTADA", motivoPerda: { categoria: "PRECO_SUPERIOR" } },
      master,
    );
    expect(resultado.status).toBe("DESCARTADA");
    expect(resultado.motivoPerdaCategoria).toBe("PRECO_SUPERIOR");
  });

  it("calcula a diferença percentual entre a proposta vencedora e a proposta do cliente", async () => {
    const { service } = criarService(participacaoFixture({ status: "HABILITACAO", valorProposto: "280000" }));
    const resultado = await service.atualizarStatus(
      PARTICIPACAO_ID,
      {
        status: "NAO_VENCEDORA",
        motivoPerda: { categoria: "PRECO_SUPERIOR", valorPropostaVencedora: 260000 },
      },
      master,
    );
    // (260000 - 280000) / 280000 * 100 = -7.142857... arredondado para -7.14
    expect(resultado.diferencaPercentualVencedora).toBe(-7.14);
  });

  it("não recalcula diferença percentual quando a proposta vencedora não é informada", async () => {
    const { service } = criarService(participacaoFixture({ status: "HABILITACAO", valorProposto: "280000" }));
    const resultado = await service.atualizarStatus(
      PARTICIPACAO_ID,
      { status: "NAO_VENCEDORA", motivoPerda: { categoria: "DESISTENCIA_PROPRIA" } },
      master,
    );
    expect(resultado.diferencaPercentualVencedora).toBeNull();
  });

  it("registra dataDecisao na primeira vez que um status terminal é atingido", async () => {
    const { service } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    const resultado = await service.atualizarStatus(
      PARTICIPACAO_ID,
      { status: "DESCARTADA", motivoPerda: { categoria: "OUTRO" } },
      master,
    );
    expect(resultado.dataDecisao).not.toBeNull();
  });

  it("registra um evento STATUS_ALTERADO a cada transição", async () => {
    const { service, eventos } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    await service.atualizarStatus(PARTICIPACAO_ID, { status: "EM_ANALISE" }, master);
    expect(eventos.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "STATUS_ALTERADO", participacaoId: PARTICIPACAO_ID }),
    );
  });
});

describe("ParticipacoesService — controle de acesso por cliente", () => {
  it("Operador vinculado ao cliente consegue atualizar a participação", async () => {
    const { service } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    await expect(
      service.atualizarStatus(PARTICIPACAO_ID, { status: "EM_ANALISE" }, operadorComAcesso),
    ).resolves.toBeDefined();
  });

  it("Operador sem vínculo ao cliente é bloqueado (ForbiddenException)", async () => {
    const { service, prisma } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    prisma.usuarioCliente.findUnique.mockResolvedValue(null);
    await expect(
      service.atualizarStatus(PARTICIPACAO_ID, { status: "EM_ANALISE" }, operadorSemAcesso),
    ).rejects.toThrow(ForbiddenException);
  });

  it("Master sempre tem acesso, independente de vínculo em UsuarioCliente", async () => {
    const { service, prisma } = criarService(participacaoFixture({ status: "SUGERIDA" }));
    prisma.usuarioCliente.findUnique.mockResolvedValue(null);
    await expect(service.atualizarStatus(PARTICIPACAO_ID, { status: "EM_ANALISE" }, master)).resolves.toBeDefined();
    expect(prisma.usuarioCliente.findUnique).not.toHaveBeenCalled();
  });
});

describe("ParticipacoesService.atualizarValorProposto", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recalcula a diferença percentual quando já existe uma proposta vencedora registrada", async () => {
    const { service } = criarService(
      participacaoFixture({ status: "NAO_VENCEDORA", valorPropostaVencedora: "260000" }),
    );
    const resultado = await service.atualizarValorProposto(PARTICIPACAO_ID, { valorProposto: 250000 }, master);
    // (260000 - 250000) / 250000 * 100 = 4
    expect(resultado.diferencaPercentualVencedora).toBe(4);
  });

  it("não define diferença percentual quando não há proposta vencedora registrada", async () => {
    const { service } = criarService(participacaoFixture({ status: "EM_DISPUTA" }));
    const resultado = await service.atualizarValorProposto(PARTICIPACAO_ID, { valorProposto: 250000 }, master);
    expect(resultado.diferencaPercentualVencedora).toBeNull();
  });
});
