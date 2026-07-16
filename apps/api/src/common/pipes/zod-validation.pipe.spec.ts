import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const schema = z.object({ nome: z.string().min(1), idade: z.number().int().nonnegative() });

  it("retorna os dados parseados quando válidos", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ nome: "Ana", idade: 30 })).toEqual({ nome: "Ana", idade: 30 });
  });

  it("lança BadRequestException quando inválido", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(() => pipe.transform({ nome: "", idade: -1 })).toThrow(BadRequestException);
  });

  it("inclui o path e a mensagem de cada campo inválido no corpo do erro", () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ nome: "", idade: -1 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as { issues: { path: string }[] };
      const paths = body.issues.map((i) => i.path);
      expect(paths).toContain("nome");
      expect(paths).toContain("idade");
    }
  });

  it("aplica transforms do schema (ex.: coerção) ao valor retornado", () => {
    const schemaComCoercao = z.object({ limite: z.coerce.number().int() });
    const pipe = new ZodValidationPipe(schemaComCoercao);
    expect(pipe.transform({ limite: "42" })).toEqual({ limite: 42 });
  });
});
