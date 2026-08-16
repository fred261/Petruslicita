import type { Page } from "playwright";
import { LOGIN_SELECTORS, PORTAL } from "../selectors.js";

export interface Credenciais {
  usuario: string;
  senha: string;
}

/** Loga no portal. Lança erro se o site indicar usuário/senha inválidos. */
export async function fazerLogin(page: Page, credenciais: Credenciais): Promise<void> {
  await page.goto(PORTAL.loginUrl);
  await page.fill(LOGIN_SELECTORS.campoUsuario, credenciais.usuario);
  await page.fill(LOGIN_SELECTORS.campoSenha, credenciais.senha);
  await page.click(LOGIN_SELECTORS.botaoEntrar);

  const falhou = page
    .locator(LOGIN_SELECTORS.indicadorLoginFalhou)
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  const logou = page
    .locator(LOGIN_SELECTORS.indicadorLoginOk)
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  const [falhouResultado, logouResultado] = await Promise.all([falhou, logou]);
  if (falhouResultado || !logouResultado) {
    throw new Error("Login no portal SEFIN falhou (usuário/senha inválidos ou seletor desatualizado).");
  }
}
