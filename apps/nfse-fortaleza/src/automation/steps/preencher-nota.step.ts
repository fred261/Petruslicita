import type { Page } from "playwright";
import { FORM_NOTA_SELECTORS } from "../selectors.js";

export interface DadosNota {
  discriminacaoServico: string;
  valorServico: number;
  aliquotaIss?: number;
  itemListaServico?: string;
  dataCompetencia?: Date;
  observacoes?: string;
}

/** Preenche o formulário da nota. Nada aqui é inferido — cada campo vem
 * exatamente do que foi definido na nota (services/notas.service.ts). */
export async function preencherFormularioNota(page: Page, dados: DadosNota): Promise<void> {
  await page.fill(FORM_NOTA_SELECTORS.campoDiscriminacaoServico, dados.discriminacaoServico);
  await page.fill(FORM_NOTA_SELECTORS.campoValorServico, formatarValorBr(dados.valorServico));

  if (dados.aliquotaIss !== undefined) {
    await page.fill(FORM_NOTA_SELECTORS.campoAliquotaIss, String(dados.aliquotaIss));
  }
  if (dados.itemListaServico) {
    await page.selectOption(FORM_NOTA_SELECTORS.campoItemListaServico, dados.itemListaServico);
  }
  if (dados.dataCompetencia) {
    await page.fill(FORM_NOTA_SELECTORS.campoDataCompetencia, formatarDataBr(dados.dataCompetencia));
  }
  if (dados.observacoes) {
    await page.fill(FORM_NOTA_SELECTORS.campoObservacoes, dados.observacoes);
  }

  // TODO: confirmar se o formulário real é uma página única ou várias etapas
  // (nesse caso, precisamos clicar "Avançar" entre cada uma e preencher em partes).
  await page.click(FORM_NOTA_SELECTORS.botaoAvancar);
}

function formatarValorBr(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

function formatarDataBr(data: Date): string {
  return data.toLocaleDateString("pt-BR");
}
