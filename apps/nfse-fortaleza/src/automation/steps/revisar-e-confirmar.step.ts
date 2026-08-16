import type { Page } from "playwright";
import { CONFIRMACAO_SELECTORS } from "../selectors.js";

export interface ResultadoEmissao {
  numeroNota: string;
  urlPdf?: string;
}

/** Tira o print da tela de revisão (antes de qualquer clique final). Usado
 * tanto no modo semi-automático (pra você conferir) quanto como registro
 * de auditoria no modo automático. */
export async function capturarTelaDeRevisao(page: Page, destino: string): Promise<void> {
  await page.screenshot({ path: destino, fullPage: true });
}

/** Clica no botão final de emissão. Só deve ser chamado depois de confirmação
 * explícita (humana, no modo semi-automático; ou pela regra da empresa, no automático). */
export async function confirmarEmissao(page: Page): Promise<ResultadoEmissao> {
  await page.click(CONFIRMACAO_SELECTORS.botaoConfirmarEmissao);

  await page.locator(CONFIRMACAO_SELECTORS.indicadorSucesso).waitFor({ state: "visible", timeout: 20000 }).catch(() => {
    throw new Error(
      "Depois de clicar em confirmar, o portal não mostrou o indicador de sucesso esperado. " +
        "A nota pode ou não ter sido emitida — confira manualmente no site antes de tentar de novo.",
    );
  });

  const numeroNota = (await page.locator(CONFIRMACAO_SELECTORS.numeroNotaEmitida).textContent())?.trim() ?? "";
  const urlPdf = await page.locator(CONFIRMACAO_SELECTORS.linkPdfNota).getAttribute("href").catch(() => null);

  if (!numeroNota) {
    throw new Error("Nota aparentemente emitida, mas não consegui ler o número da nota na tela. Confira manualmente.");
  }

  return { numeroNota, urlPdf: urlPdf ?? undefined };
}
