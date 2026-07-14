import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ParticipacoesController } from "./participacoes.controller";

/** Regressão: GET /participacoes/:id/eventos deve validar acesso ao cliente antes de retornar dados. */
describe("ParticipacoesController.eventos", () => {
  const autor: AuthenticatedUser = { userId: "u1", email: "u1@escritorio.com.br", papel: "OPERADOR" };

  it("propaga o ForbiddenException de buscarPorId e não chama o EventosService", async () => {
    const participacoesService = {
      buscarPorId: vi.fn().mockRejectedValue(new ForbiddenException("Você não tem acesso a este cliente.")),
    };
    const eventosService = { listarPorParticipacao: vi.fn() };
    const controller = new ParticipacoesController(participacoesService as never, eventosService as never);

    await expect(controller.eventos("part_de_outro_cliente", autor)).rejects.toThrow(ForbiddenException);
    expect(eventosService.listarPorParticipacao).not.toHaveBeenCalled();
  });

  it("retorna os eventos quando o acesso é permitido", async () => {
    const participacoesService = { buscarPorId: vi.fn().mockResolvedValue({ id: "part_1" }) };
    const eventosService = { listarPorParticipacao: vi.fn().mockResolvedValue([{ id: "ev_1" }]) };
    const controller = new ParticipacoesController(participacoesService as never, eventosService as never);

    const resultado = await controller.eventos("part_1", autor);

    expect(participacoesService.buscarPorId).toHaveBeenCalledWith("part_1", autor);
    expect(resultado).toEqual([{ id: "ev_1" }]);
  });
});
