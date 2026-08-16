import type { Page } from "playwright";
import { SELECAO_EMPRESA_SELECTORS } from "../selectors.js";

/** Escolhe o CNPJ/empresa a ser usado na emissão, dentre os disponíveis para o login logado. */
export async function selecionarEmpresa(page: Page, cnpj: string): Promise<void> {
  const linha = page.locator(SELECAO_EMPRESA_SELECTORS.linhaEmpresaPorCnpj(cnpj));
  await linha.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
    throw new Error(
      `CNPJ ${cnpj} não apareceu na lista de empresas do portal para este login. Confira se o login tem acesso a este CNPJ.`,
    );
  });
  await linha.click();
}
