import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { Role } from "@petrus/shared";
import { RolesGuard } from "./roles.guard";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

function criarContexto(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function criarReflectorComPapeis(papeis: Role[] | undefined): Reflector {
  return { getAllAndOverride: vi.fn().mockReturnValue(papeis) } as unknown as Reflector;
}

const usuario = (papel: Role): AuthenticatedUser => ({ userId: "u1", email: "u1@escritorio.com.br", papel });

describe("RolesGuard", () => {
  it("libera a rota quando nenhum @Roles() foi declarado", () => {
    const guard = new RolesGuard(criarReflectorComPapeis(undefined));
    expect(guard.canActivate(criarContexto(usuario("OPERADOR")))).toBe(true);
  });

  it("libera a rota quando @Roles() está vazio", () => {
    const guard = new RolesGuard(criarReflectorComPapeis([]));
    expect(guard.canActivate(criarContexto(usuario("OPERADOR")))).toBe(true);
  });

  it("permite acesso quando o papel do usuário está na lista exigida", () => {
    const guard = new RolesGuard(criarReflectorComPapeis(["MASTER", "ADMIN"]));
    expect(guard.canActivate(criarContexto(usuario("ADMIN")))).toBe(true);
  });

  it("nega acesso quando o papel do usuário não está na lista exigida", () => {
    const guard = new RolesGuard(criarReflectorComPapeis(["MASTER", "ADMIN"]));
    expect(() => guard.canActivate(criarContexto(usuario("OPERADOR")))).toThrow(ForbiddenException);
  });

  it("nega acesso quando não há usuário autenticado na requisição", () => {
    const guard = new RolesGuard(criarReflectorComPapeis(["MASTER"]));
    expect(() => guard.canActivate(criarContexto(undefined))).toThrow(ForbiddenException);
  });

  it("nega acesso restrito a MASTER quando o papel é ADMIN (regra da tela de Auditoria)", () => {
    const guard = new RolesGuard(criarReflectorComPapeis(["MASTER"]));
    expect(() => guard.canActivate(criarContexto(usuario("ADMIN")))).toThrow(ForbiddenException);
  });
});
