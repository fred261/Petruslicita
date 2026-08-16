import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface SessaoNavegador {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  fechar: () => Promise<void>;
}

/**
 * Abre um navegador para a automação. Em modo semi-automático rodamos
 * "headed" (janela visível) de propósito — é o que permite você conferir
 * a tela real do portal antes de confirmar a emissão. Em modo automático
 * (server/CI) roda headless.
 */
export async function abrirSessao(opts?: { headless?: boolean }): Promise<SessaoNavegador> {
  const headless = opts?.headless ?? process.env.NFSE_HEADLESS === "true";
  const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 150 });
  const context = await browser.newContext();
  const page = await context.newPage();
  return {
    browser,
    context,
    page,
    fechar: async () => {
      await context.close();
      await browser.close();
    },
  };
}
