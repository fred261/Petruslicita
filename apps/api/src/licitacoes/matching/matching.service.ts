import { Injectable } from "@nestjs/common";

interface PalavraChave {
  termo: string;
  peso: number;
}

interface ClienteParaMatching {
  cnaePrincipalDescricao: string;
  cnaesSecundarios: unknown;
  palavrasChave: unknown;
}

export interface ResultadoMatching {
  score: number;
  termos: string[];
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "para", "com", "a", "o", "as", "os",
  "por", "no", "na", "nos", "nas", "que", "ou", "sob", "sobre", "ao", "aos",
]);

/**
 * Motor de matching: cruza objeto/texto do edital com CNAE e palavras-chave
 * de cada Cliente. Gera apenas uma pontuação/sugestão — nunca cria
 * Participação sozinho, isso é sempre uma ação humana confirmada.
 */
@Injectable()
export class MatchingService {
  calcularScore(cliente: ClienteParaMatching, objetoLicitacao: string): ResultadoMatching {
    const objetoNormalizado = normalizar(objetoLicitacao);
    const termosEncontrados: string[] = [];
    let score = 0;

    const palavrasChave = Array.isArray(cliente.palavrasChave) ? (cliente.palavrasChave as PalavraChave[]) : [];
    for (const { termo, peso } of palavrasChave) {
      if (!termo) continue;
      if (objetoNormalizado.includes(normalizar(termo))) {
        score += peso;
        termosEncontrados.push(termo);
      }
    }

    const palavrasObjeto = new Set(
      objetoNormalizado.split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    );
    const palavrasCnae = extrairPalavrasSignificativas(cliente.cnaePrincipalDescricao);
    for (const palavra of palavrasCnae) {
      if (palavrasObjeto.has(palavra)) {
        score += 1;
        termosEncontrados.push(palavra);
      }
    }

    return { score, termos: [...new Set(termosEncontrados)] };
  }
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extrairPalavrasSignificativas(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}
