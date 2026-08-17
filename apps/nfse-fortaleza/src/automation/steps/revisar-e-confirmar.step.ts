import type { Page } from "playwright";
import { CONFIRMACAO_SELECTORS } from "../selectors.js";

export interface ResultadoEmissao {
  /** Opcional de propósito: decidimos não depender de extrair o número da
   * nota por seletor (o Frederico prefere conferir/recuperar a nota direto
   * no portal, em "Consultar NFS-e", em vez de confiar numa raspagem dessa
   * tela). Quando disponível, fica só como registro extra. */
  numeroNota?: string;
  urlPdf?: string;
}

/** Tira o print da tela de revisão (antes de qualquer clique final). Usado
 * tanto no modo semi-automático (pra você conferir) quanto como registro
 * de auditoria no modo automático. Chamado depois que preencherFormularioNota
 * já clicou em "Validar Campos Obrigatórios da NFS-e", que abre o modal
 * "Você confirma a geração deste documento?". */
export async function capturarTelaDeRevisao(page: Page, destino: string): Promise<void> {
  await page.locator(CONFIRMACAO_SELECTORS.modalConfirmacao).waitFor({ state: "visible", timeout: 15000 }).catch(() => {
    throw new Error(
      "Depois de clicar em \"Validar Campos Obrigatórios da NFS-e\", o modal de confirmação não apareceu. " +
        "Pode ser um campo obrigatório faltando (o portal costuma mostrar mensagens de erro em vez do modal) — confira manualmente.",
    );
  });
  await page.screenshot({ path: destino, fullPage: true });
}

/** Clica em "Sim" no modal de confirmação, e depois no botão final
 * "Confirmar Emissão de NFS-e" (emitirnfseForm:btnEmitir) — que é o clique
 * que de fato emite o documento fiscal (ponto de não-retorno, com efeito
 * tributário real). Só deve ser chamado depois de confirmação explícita
 * (humana, no modo semi-automático; ou pela regra da empresa, no automático).
 *
 * Decisão deliberada: NÃO tentamos raspar o número da nota / link do PDF da
 * tela pós-emissão. Mapear aquela tela exigiria emitir uma nota real de
 * teste só pra ver o HTML, o que o Frederico não quer (tem implicação
 * tributária). Ele prefere recuperar a nota emitida direto no portal, em
 * "Consultar NFS-e". Por isso este step só garante que os dois cliques
 * mapeados e seguros aconteceram, tira um print de auditoria logo depois do
 * clique final (screenshotFinal, opcional), e retorna sucesso sem número —
 * quem confirma o resultado de fato é você, olhando o portal. */
export async function confirmarEmissao(page: Page, screenshotFinal?: string): Promise<ResultadoEmissao> {
  await page.click(CONFIRMACAO_SELECTORS.botaoSimNoModal);
  await page.locator(CONFIRMACAO_SELECTORS.modalConfirmacao).waitFor({ state: "hidden", timeout: 15000 }).catch(() => {
    throw new Error("Cliquei em \"Sim\" no modal de confirmação, mas ele não fechou como esperado. Confira manualmente.");
  });

  await page.locator(CONFIRMACAO_SELECTORS.botaoConfirmarEmissao).waitFor({ state: "visible", timeout: 15000 }).catch(() => {
    throw new Error(
      "Depois de \"Sim\" no modal, o botão \"Confirmar Emissão de NFS-e\" (emitirnfseForm:btnEmitir) não apareceu " +
        "como esperado. Confira manualmente antes de tentar de novo.",
    );
  });

  // A partir daqui é o ponto de não-retorno: este clique emite o documento.
  await page.click(CONFIRMACAO_SELECTORS.botaoConfirmarEmissao);

  // Dá um tempo pro AJAX da emissão terminar antes do print — não temos um
  // seletor de "sucesso" mapeado pra esperar de forma precisa (ver TODO em
  // selectors.ts), então usamos uma espera curta best-effort.
  await page.waitForTimeout(3000);

  if (screenshotFinal) {
    await page.screenshot({ path: screenshotFinal, fullPage: true }).catch(() => {
      // Print de auditoria é "nice to have" — se falhar, não derruba a
      // emissão que já aconteceu de verdade no portal.
    });
  }

  return {};
}
