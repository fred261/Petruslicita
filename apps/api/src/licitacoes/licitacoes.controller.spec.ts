import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { LicitacoesController } from "./licitacoes.controller";

/** Regressão: GET /licitacoes/:id/eventos deve repassar o autor autenticado ao serviço, que escopa por cliente. */
describe("LicitacoesController.eventos", () => {
  it("repassa o usuário autenticado para EventosService.listarPorLicitacao", () => {
    const licitacoesService = {};
    const eventosService = { listarPorLicitacao: vi.fn().mockReturnValue([]) };
    const controller = new LicitacoesController(licitacoesService as never, eventosService as never);
    const autor: AuthenticatedUser = { userId: "u1", email: "u1@escritorio.com.br", papel: "OPERADOR" };

    controller.eventos("lic_1", autor);

    expect(eventosService.listarPorLicitacao).toHaveBeenCalledWith("lic_1", autor);
  });
});
