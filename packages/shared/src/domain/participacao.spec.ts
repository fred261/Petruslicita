import { describe, expect, it } from "vitest";
import {
  FASE_FUNIL_POR_STATUS,
  STATUS_EXIGE_MOTIVO_PERDA,
  STATUS_PARTICIPACAO,
  STATUS_TERMINAIS,
  TRANSICOES_PERMITIDAS,
} from "./participacao";

describe("TRANSICOES_PERMITIDAS", () => {
  it("tem uma entrada para todo status do pipeline", () => {
    for (const status of STATUS_PARTICIPACAO) {
      expect(TRANSICOES_PERMITIDAS).toHaveProperty(status);
    }
  });

  it("só referencia status válidos como destino", () => {
    for (const destinos of Object.values(TRANSICOES_PERMITIDAS)) {
      for (const destino of destinos) {
        expect(STATUS_PARTICIPACAO).toContain(destino);
      }
    }
  });

  it("status terminais não têm transições de saída", () => {
    for (const status of STATUS_TERMINAIS) {
      expect(TRANSICOES_PERMITIDAS[status]).toEqual([]);
    }
  });

  it("DESCARTADA é sempre um destino possível antes de um resultado final", () => {
    const statusAntesDoResultado: (typeof STATUS_PARTICIPACAO)[number][] = [
      "SUGERIDA",
      "EM_ANALISE",
      "EM_PREPARACAO",
      "ENVIADA",
      "EM_DISPUTA",
      "HABILITACAO",
      "RECURSAL",
    ];
    for (const status of statusAntesDoResultado) {
      expect(TRANSICOES_PERMITIDAS[status]).toContain("DESCARTADA");
    }
  });

  it("só é possível chegar a CONTRATADA passando por HOMOLOGADA", () => {
    for (const [origem, destinos] of Object.entries(TRANSICOES_PERMITIDAS)) {
      if (destinos.includes("CONTRATADA")) {
        expect(origem).toBe("HOMOLOGADA");
      }
    }
  });
});

describe("STATUS_EXIGE_MOTIVO_PERDA", () => {
  it("exige motivo exatamente para DESCARTADA e NAO_VENCEDORA", () => {
    expect(STATUS_EXIGE_MOTIVO_PERDA.sort()).toEqual(["DESCARTADA", "NAO_VENCEDORA"].sort());
  });

  it("todo status que exige motivo é alcançável por alguma transição", () => {
    const destinosPossiveis = new Set(Object.values(TRANSICOES_PERMITIDAS).flat());
    for (const status of STATUS_EXIGE_MOTIVO_PERDA) {
      expect(destinosPossiveis.has(status)).toBe(true);
    }
  });
});

describe("FASE_FUNIL_POR_STATUS", () => {
  it("mapeia todo status do pipeline a exatamente uma fase", () => {
    for (const status of STATUS_PARTICIPACAO) {
      expect(FASE_FUNIL_POR_STATUS).toHaveProperty(status);
    }
  });

  it("DESCARTADA é a única fase FORA_DO_FUNIL", () => {
    const foraDoFunil = STATUS_PARTICIPACAO.filter((s) => FASE_FUNIL_POR_STATUS[s] === "FORA_DO_FUNIL");
    expect(foraDoFunil).toEqual(["DESCARTADA"]);
  });
});
