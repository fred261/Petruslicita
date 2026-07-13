import { SetMetadata } from "@nestjs/common";
import type { Role } from "@petrus/shared";

export const ROLES_KEY = "roles";

/** Restringe a rota aos papéis informados. Sem este decorator, qualquer usuário autenticado acessa. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
