import { describe, expect, it, beforeAll } from "vitest";
import { decryptSecret, encryptSecret } from "./secret-box.js";

describe("secret-box (criptografia das credenciais da SEFIN)", () => {
  beforeAll(() => {
    // Chave de teste — nunca use isso em produção, é só pra rodar o suite.
    process.env.NFSE_MASTER_KEY = "chave-de-teste-nao-usar-em-producao-1234567890";
  });

  it("faz o round-trip encrypt -> decrypt corretamente", () => {
    const original = "minhaSenhaSuperSecreta!123";
    const criptografado = encryptSecret(original);

    expect(criptografado).not.toContain(original);
    expect(criptografado.split(":")).toHaveLength(3);

    const decifrado = decryptSecret(criptografado);
    expect(decifrado).toBe(original);
  });

  it("gera ciphertexts diferentes para o mesmo texto (IV aleatório)", () => {
    const a = encryptSecret("mesma-senha");
    const b = encryptSecret("mesma-senha");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("mesma-senha");
    expect(decryptSecret(b)).toBe("mesma-senha");
  });

  it("rejeita payload malformado", () => {
    expect(() => decryptSecret("nao-e-um-payload-valido")).toThrow();
  });

  it("rejeita payload adulterado (tag de autenticação não bate)", () => {
    const criptografado = encryptSecret("outra-senha");
    const [iv, tag, dados] = criptografado.split(":");
    const dadosAdulterados = dados.slice(0, -2) + (dados.slice(-2) === "AA" ? "BB" : "AA");
    expect(() => decryptSecret([iv, tag, dadosAdulterados].join(":"))).toThrow();
  });
});
