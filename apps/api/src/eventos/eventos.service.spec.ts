import { describe, expect, it, vi } from "vitest";
import { EventosService } from "./eventos.service";

/**
 * Regressão dos dois IDORs encontrados na revisão de segurança: um Operador
 * não pode ver eventos de Participações de clientes aos quais não está
 * vinculado, mesmo quando os eventos pertencem à mesma Licitação (recurso
 * compartilhado, sem sigilo próprio) que uma Participação de um cliente seu.
 *
 * A query real é validada por Prisma/Postgres; aqui fixamos o contrato do
 * `where` construído pelo serviço, que é a parte testável sem banco.
 */

function criarPrismaFake() {
  const findMany = vi.fn().mockResolvedValue([]);
  return { evento: { findMany } };
}

const LICITACAO_ID = "lic_1";

describe("EventosService.listarPorLicitacao", () => {
  it("MASTER: consulta sem restrição adicional além da licitação", async () => {
    const prisma = criarPrismaFake();
    const service = new EventosService(prisma as never);

    await service.listarPorLicitacao(LICITACAO_ID, { userId: "user_master", papel: "MASTER" });

    expect(prisma.evento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { licitacaoId: LICITACAO_ID } }),
    );
  });

  it("ADMIN: consulta sem restrição adicional além da licitação", async () => {
    const prisma = criarPrismaFake();
    const service = new EventosService(prisma as never);

    await service.listarPorLicitacao(LICITACAO_ID, { userId: "user_admin", papel: "ADMIN" });

    expect(prisma.evento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { licitacaoId: LICITACAO_ID } }),
    );
  });

  it("OPERADOR: consulta restringe eventos de participação aos clientes vinculados ao operador", async () => {
    const prisma = criarPrismaFake();
    const service = new EventosService(prisma as never);
    const operadorId = "user_operador_a";

    await service.listarPorLicitacao(LICITACAO_ID, { userId: operadorId, papel: "OPERADOR" });

    expect(prisma.evento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          licitacaoId: LICITACAO_ID,
          OR: [
            { participacaoId: null },
            { participacao: { cliente: { usuarios: { some: { usuarioId: operadorId } } } } },
          ],
        },
      }),
    );
  });

  it("OPERADOR: a cláusula OR nunca fica ausente (não pode degradar para o comportamento de MASTER/ADMIN)", async () => {
    const prisma = criarPrismaFake();
    const service = new EventosService(prisma as never);

    await service.listarPorLicitacao(LICITACAO_ID, { userId: "qualquer", papel: "OPERADOR" });

    const chamada = prisma.evento.findMany.mock.calls[0][0];
    expect(chamada.where).toHaveProperty("OR");
    expect(Array.isArray(chamada.where.OR)).toBe(true);
    expect(chamada.where.OR.length).toBeGreaterThan(0);
  });
});

describe("EventosService.listarPorParticipacao", () => {
  it("filtra estritamente por participacaoId (a checagem de acesso ao cliente é responsabilidade do controller/service chamador)", async () => {
    const prisma = criarPrismaFake();
    const service = new EventosService(prisma as never);

    await service.listarPorParticipacao("part_1");

    expect(prisma.evento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { participacaoId: "part_1" } }),
    );
  });
});
