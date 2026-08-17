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

/** Clica em "Sim" no modal de confirmação, e depois no botão final
 * "Confirmar Emissão de NFS-e" (emitirnfseForm:btnEmitir) — que é o clique
 * que de fato emite o documento fiscal (ponto de não-retorno). Só deve ser
 * chamado depois de confirmação explícita (humana, no modo semi-automático;
 * ou pela regra da empresa, no automático).
 *
 * TODO: ainda não mapeei o que acontece DEPOIS de clicar em "Confirmar
 * Emissão de NFS-e" — deveria aparecer o número da nota emitida e/ou um
 * link do PDF, mas essa tela ainda não foi vista. Por isso este step clica
 * em ambos os botões (que já são seguros/mapeados) e então lança erro
 * pedindo o HTML dessa última tela — a nota PODE já ter sido emitida de
 * verdade nesse ponto, então é preciso conferir manualmente antes de
 * tentar de novo, pra não duplicar. */
export async function confirmarEmissao(page: Page): Promise<ResultadoEmissao> {
  await page.click(CONFIRMACAO_SELECTORS.botaoSimNoModal);
  await page.locator(CONFIRMACAO_SELECTORS.modalConfirmacao).waitFor({ state: "hidden", timeout: 15000 }).catch(() => {
    throw new Error("Cliquei em \"Sim\" no modal de confirmação, mas ele não fechou como esperado. Confira manualmente.");
  });

  await page.locator(CONFIRMACAO_SELECTORS.botaoConfirmarEmissao).waitFor({ state: "visible", timeout: 15000 }).catch(() => {
    throw new Error(
      "Depois de \"Sim\" no modal, o botão \"Confirmar Emissão de NFS-e\" (emitirnfseForm:btnEmitir) não apareceu " +
        "como esperado. Confira manualmente.",
    );
  });
  await page.click(CONFIRMACAO_SELECTORS.botaoConfirmarEmissao);

  throw new Error(
    "Cliquei em \"Confirmar Emissão de NFS-e\" — a essa altura o documento fiscal PODE já ter sido emitido de " +
      "verdade no portal. A tela que aparece a seguir (onde deveria estar o número da nota e/ou o link do PDF) " +
      "ainda não foi mapeada. NÃO tente de novo sem antes conferir manualmente no site se a nota já saiu, pra não " +
      "duplicar. Me manda o HTML dessa tela final pra eu terminar o mapeamento.",
  );
}
