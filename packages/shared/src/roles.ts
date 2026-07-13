/**
 * Papéis de acesso do sistema. EMPRESA já existe no modelo desde o início
 * (ver spec: "Extensibilidade prevista") mas não possui telas ativas ainda.
 */
export const ROLES = ["MASTER", "ADMIN", "OPERADOR", "EMPRESA"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  MASTER: "Master",
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  EMPRESA: "Empresa",
};

/** Papéis com acesso à área interna do escritório (tudo exceto o portal Empresa). */
export const STAFF_ROLES: Role[] = ["MASTER", "ADMIN", "OPERADOR"];

/** Papéis que podem gerenciar usuários. */
export const USER_MANAGER_ROLES: Role[] = ["MASTER", "ADMIN"];

/** Papéis para os quais 2FA é recomendado/obrigatório na política atual. */
export const TWO_FACTOR_RECOMMENDED_ROLES: Role[] = ["MASTER", "ADMIN"];

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
