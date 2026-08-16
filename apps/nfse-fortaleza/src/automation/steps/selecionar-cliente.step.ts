import type { Page } from "playwright";
import { MENU_SELECTORS, SELECAO_CLIENTE_SELECTORS } from "../selectors.js";

/** Navega até a emissão de NFS-e e escolhe um cliente/tomador já cadastrado
 * no portal, pela busca de "Nome ou Razão Social" (autocomplete). Digitar
 * dispara a sugestão via AJAX; clicar na sugestão certa já carrega os dados
 * do cliente na aba Tomador — não precisa de confirmação extra. */
export async function irParaEmissaoEEscolherCliente(page: Page, nomeCliente: string): Promise<void> {
  await page.click(MENU_SELECTORS.linkEmitirNota);

  await page.click(SELECAO_CLIENTE_SELECTORS.radioTipoBuscaNomeRazaoSocial);
  await page.fill(SELECAO_CLIENTE_SELECTORS.campoBusca, nomeCliente);

  const sugestao = page.locator(SELECAO_CLIENTE_SELECTORS.sugestaoPorTexto(nomeCliente));
  await sugestao.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
    throw new Error(
      `Cliente "${nomeCliente}" não apareceu na busca do portal. Confira se ele está cadastrado no site com esse nome (Nome ou Razão Social).`,
    );
  });
  await sugestao.click();
}
