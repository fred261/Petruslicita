import type { Page } from "playwright";
import { CONFIRMACAO_SELECTORS, TELA_RESULTADO_SELECTORS } from "../selectors.js";

export interface ResultadoEmissao {
  /** Opcional de propósito: a extração é best-effort (ver confirmarEmissao)
   * — o Frederico prefere conferir/recuperar a nota direto no portal, em
   * "Consultar NFS-e", em vez de confiar cegamente numa raspagem dessa tela.
   * Quando disponível, fica só como registro extra de conveniência. */
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
 * Depois desse clique o portal redireciona pra tela de consulta da nota
 * (mesma view de "Consultar NFS-e"), com Número da Nota / Chave de Acesso
 * ADN / Situação no Ambiente Nacional. A extração desses campos aqui é só
 * um bônus de conveniência (best-effort, com timeout curto) — se não
 * conseguirmos achar os campos, ainda assim consideramos a emissão bem
 * sucedida (os dois cliques mapeados e seguros já aconteceram) e tiramos um
 * print de auditoria. A fonte de verdade continua sendo o próprio portal —
 * é lá que você deve confirmar/recuperar a nota, em "Consultar NFS-e". */
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

  // Best-effort: espera o campo "Número da Nota" da tela de resultado
  // aparecer. Se não aparecer no tempo (ex.: layout mudou, demora mais,
  // etc.), não tratamos como falha — só seguimos sem o número.
  const campoNumeroNota = page.locator(TELA_RESULTADO_SELECTORS.numeroNota).first();
  await campoNumeroNota.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});

  const numeroNota = await campoNumeroNota.inputValue().catch(() => undefined);

  if (screenshotFinal) {
    await page.screenshot({ path: screenshotFinal, fullPage: true }).catch(() => {
      // Print de auditoria é "nice to have" — se falhar, não derruba a
      // emissão que já aconteceu de verdade no portal.
    });
  }

  return { numeroNota: numeroNota || undefined };
}
