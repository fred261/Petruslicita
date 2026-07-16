import { describe, expect, it } from "vitest";
import { filtroAccessLogSchema, filtroAuditLogSchema } from "./auditoria";

describe("filtroAccessLogSchema", () => {
  it("interpreta sucesso=false como false (regressão: z.coerce.boolean trataria qualquer string não-vazia como true)", () => {
    const resultado = filtroAccessLogSchema.parse({ sucesso: "false" });
    expect(resultado.sucesso).toBe(false);
  });

  it("interpreta sucesso=true como true", () => {
    const resultado = filtroAccessLogSchema.parse({ sucesso: "true" });
    expect(resultado.sucesso).toBe(true);
  });

  it("deixa sucesso undefined quando não informado", () => {
    const resultado = filtroAccessLogSchema.parse({});
    expect(resultado.sucesso).toBeUndefined();
  });

  it("rejeita valores fora de true/false", () => {
    expect(() => filtroAccessLogSchema.parse({ sucesso: "yes" })).toThrow();
  });

  it("aplica limite máximo de 500", () => {
    expect(() => filtroAccessLogSchema.parse({ limite: "501" })).toThrow();
    expect(filtroAccessLogSchema.parse({ limite: "500" }).limite).toBe(500);
  });
});

describe("filtroAuditLogSchema", () => {
  it("aceita filtro vazio", () => {
    expect(filtroAuditLogSchema.parse({})).toEqual({});
  });

  it("rejeita limite não numérico", () => {
    expect(() => filtroAuditLogSchema.parse({ limite: "abc" })).toThrow();
  });
});
