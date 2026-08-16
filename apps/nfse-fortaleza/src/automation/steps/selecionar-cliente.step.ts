import type { Page } from "playwright";
import { MENU_SELECTORS, SELECAO_CLIENTE_SELECTORS } from "../selectors.js";

/** Navega até a emissão de NFS-e e escolhe um cliente/tomador já cadastrado no portal. */
export async function irParaEmissaoEEscolherCliente(page: Page, nomeCliente: string): Promise<void> {
  await page.click(MENU_SELECTORS.linkEmitirNota);
  await page.fill(SELECAO_CLIENTE_SELECTORS.campoBuscaCliente, nomeCliente);

  const resultado = page.locator(SELECAO_CLIENTE_SELECTORS.resultadoClientePorNome(nomeCliente));
  await resultado.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
    throw new Error(
      `Cliente "${nomeCliente}" não apareceu na busca do portal. Confira se ele está cadastrado no site com esse nome.`,
    );
  });
  await resultado.click();
}
