import type { Page } from "playwright";
import { LOGIN_SELECTORS, PORTAL } from "../selectors.js";

export interface Credenciais {
  /** CPF de login no Keycloak da SEFIN. Pode ser salvo com ou sem
   * pontuação — normalizamos para dígitos antes de digitar. */
  usuario: string;
  senha: string;
}

/** Loga no portal. O login é OAuth2 via Keycloak: clicamos em "Fazer login"
 * na página inicial da SEFIN, o site redireciona para
 * idp2.sefin.fortaleza.ce.gov.br, onde entram CPF e senha de verdade, e
 * depois o Keycloak redireciona de volta ao portal. */
export async function fazerLogin(page: Page, credenciais: Credenciais): Promise<void> {
  await page.goto(PORTAL.baseUrl);
  await Promise.all([page.waitForNavigation(), page.click(LOGIN_SELECTORS.botaoFazerLogin)]);

  // O campo de CPF tem uma máscara (jquery.inputmask) que escuta eventos de
  // teclado — page.type() simula digitação de verdade, diferente de
  // page.fill() (que só seta o .value via JS e pode não acionar a máscara).
  const cpfSomenteDigitos = credenciais.usuario.replace(/\D/g, "");
  await page.click(LOGIN_SELECTORS.campoUsuario);
  await page.type(LOGIN_SELECTORS.campoUsuario, cpfSomenteDigitos, { delay: 30 });
  await page.fill(LOGIN_SELECTORS.campoSenha, credenciais.senha);
  await Promise.all([page.waitForNavigation(), page.click(LOGIN_SELECTORS.botaoEntrar)]);

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
