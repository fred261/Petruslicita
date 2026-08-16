import type { Page } from "playwright";
import { FORM_NOTA_SELECTORS } from "../selectors.js";

export interface DadosNota {
  /** Descrição do CNAE, EXATAMENTE como aparece no dropdown (ex.:
   * "CONSULTORIA EM TECNOLOGIA DA INFORMAÇÃO"). Define a alíquota
   * automaticamente — por isso reaproveitamos o campo `itemListaServico`
   * do banco (services/notas.service.ts) pra guardar esse texto. */
  itemListaServico?: string;
  discriminacaoServico: string;
  valorServico: number;
  /** Usado só para derivar mês/ano de competência — o portal não aceita
   * uma data completa, só mês e ano separados. */
  dataCompetencia?: Date;
  observacoes?: string;
}

/** Preenche o formulário da nota (abas Serviço e Valores) e clica em
 * "Validar Campos Obrigatórios da NFS-e", que abre o modal de confirmação.
 * NÃO confirma o modal — isso é responsabilidade do step de revisão/
 * confirmação, que decide entre esperar humano ou confirmar direto. */
export async function preencherFormularioNota(page: Page, dados: DadosNota): Promise<void> {
  await page.click(FORM_NOTA_SELECTORS.abaServico);

  if (dados.dataCompetencia) {
    await page.selectOption(FORM_NOTA_SELECTORS.comboMesCompetencia, {
      label: nomeDoMes(dados.dataCompetencia),
    });
    await page.selectOption(FORM_NOTA_SELECTORS.comboAnoCompetencia, {
      value: String(dados.dataCompetencia.getFullYear()),
    });
  }

  if (dados.itemListaServico) {
    await page.selectOption(FORM_NOTA_SELECTORS.comboCnae, { label: dados.itemListaServico });
  } else {
    throw new Error(
      "Nenhum CNAE informado (itemListaServico). O portal exige escolher o CNAE do serviço — não dá pra emitir sem isso.",
    );
  }

  await page.fill(FORM_NOTA_SELECTORS.campoDescricaoServico, dados.discriminacaoServico);

  await page.click(FORM_NOTA_SELECTORS.abaValores);
  await page.fill(FORM_NOTA_SELECTORS.campoValorServico, formatarValorBr(dados.valorServico));

  await page.click(FORM_NOTA_SELECTORS.botaoValidar);
}

function formatarValorBr(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function nomeDoMes(data: Date): string {
  return MESES[data.getMonth()];
}
