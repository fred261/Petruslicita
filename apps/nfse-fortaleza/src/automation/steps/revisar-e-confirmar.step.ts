import type { Page } from "playwright";
import { CONFIRMACAO_SELECTORS } from "../selectors.js";

export interface ResultadoEmissao {
  numeroNota: string;
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

/** Clica em "Sim" no modal de confirmação. Só deve ser chamado depois de
 * confirmação explícita (humana, no modo semi-automático; ou pela regra da
 * empresa, no automático).
 *
 * TODO: ainda não mapeei o que acontece DEPOIS de clicar "Sim" aqui — o
 * portal deveria preencher a área emitirnfseForm:divEmitirNota com um botão
 * final de emissão e/ou mostrar o número da nota, mas isso não foi visto
 * ainda. Por enquanto este step clica "Sim" e lança erro pedindo pra
 * conferir manualmente — precisamos do HTML dessa próxima tela pra terminar. */
export async function confirmarEmissao(page: Page): Promise<ResultadoEmissao> {
  await page.click(CONFIRMACAO_SELECTORS.botaoSimNoModal);
  await page.locator(CONFIRMACAO_SELECTORS.modalConfirmacao).waitFor({ state: "hidden", timeout: 15000 }).catch(() => {
    throw new Error("Cliquei em \"Sim\" no modal de confirmação, mas ele não fechou como esperado. Confira manualmente.");
  });

  throw new Error(
    "Cliquei em \"Sim\" na confirmação, mas a tela seguinte (onde deveria aparecer o botão final de emitir e/ou o " +
      "número da nota) ainda não foi mapeada. A operação PODE ter avançado no portal — confira manualmente antes " +
      "de tentar de novo, pra não duplicar a nota. Me manda o HTML dessa tela pra eu terminar o mapeamento.",
  );
}
