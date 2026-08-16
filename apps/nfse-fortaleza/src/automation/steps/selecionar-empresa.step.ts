import type { Page } from "playwright";
import { SELECAO_EMPRESA_SELECTORS } from "../selectors.js";

/** Formata um CNPJ (só dígitos ou já formatado) como 99.999.999/9999-99,
 * igual ao que aparece na tabela do modal "Selecione Inscrição". */
function formatarCnpj(cnpj: string): string {
  const digitos = cnpj.replace(/\D/g, "");
  if (digitos.length !== 14) return cnpj; // já formatado ou inesperado — usa como veio
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/** Escolhe o CNPJ/empresa a ser usado na emissão, via o modal "Selecione
 * Inscrição". No primeiro login o modal costuma abrir sozinho; se não
 * abrir, clicamos no botão de trocar inscrição pra abrir manualmente. */
export async function selecionarEmpresa(page: Page, cnpj: string): Promise<void> {
  const modal = page.locator(SELECAO_EMPRESA_SELECTORS.modalContainer);
  const jaAberto = await modal.isVisible().catch(() => false);
  if (!jaAberto) {
    await page.click(SELECAO_EMPRESA_SELECTORS.botaoAbrirTrocaInscricao);
    await modal.waitFor({ state: "visible", timeout: 10000 });
  }

  const cnpjFormatado = formatarCnpj(cnpj);
  const linha = page.locator(SELECAO_EMPRESA_SELECTORS.linhaEmpresaPorCnpj(cnpjFormatado));
  await linha.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
    throw new Error(
      `CNPJ ${cnpjFormatado} não apareceu na tabela de inscrições do portal. Confira se o login tem acesso a este CNPJ.`,
    );
  });

  await linha.locator(SELECAO_EMPRESA_SELECTORS.linkSelecionarNaLinha).click();
  // A seleção é via AJAX (RichFaces) — sem navegação de página. Esperamos o
  // modal fechar como sinal de que a troca de inscrição foi aplicada.
  await modal.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {
    throw new Error(
      "Cliquei em \"Selecionar\" na tabela de inscrições, mas o modal não fechou como esperado. Confira manualmente.",
    );
  });
}
