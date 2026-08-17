import { prisma } from "../db/client.js";
import type { ModoEmissao } from "../types.js";

export interface CriarNotaInput {
  empresaId: string;
  clienteId: string;
  discriminacaoServico: string;
  valorServico: number;
  aliquotaIss?: number;
  itemListaServico?: string;
  dataCompetencia?: Date;
  observacoes?: string;
  modo: ModoEmissao;
}

/** Cria a nota em RASCUNHO. Nenhum valor é inferido/estimado — tudo precisa
 * vir explicitamente do usuário antes de existir um registro. */
export async function criarNota(input: CriarNotaInput) {
  return prisma.notaFiscal.create({
    data: {
      empresaId: input.empresaId,
      clienteId: input.clienteId,
      discriminacaoServico: input.discriminacaoServico,
      valorServico: input.valorServico,
      aliquotaIss: input.aliquotaIss,
      itemListaServico: input.itemListaServico,
      dataCompetencia: input.dataCompetencia,
      observacoes: input.observacoes,
      modo: input.modo,
    },
  });
}

export async function buscarNota(id: string) {
  const nota = await prisma.notaFiscal.findUnique({
    where: { id },
    include: { empresa: true, cliente: true },
  });
  if (!nota) throw new Error(`Nota ${id} não encontrada.`);
  return nota;
}

export async function marcarAguardandoRevisao(id: string, screenshotPath: string) {
  return prisma.notaFiscal.update({
    where: { id },
    data: { status: "AGUARDANDO_REVISAO", screenshotRevisaoPath: screenshotPath },
  });
}

export async function marcarEmitindo(id: string) {
  return prisma.notaFiscal.update({ where: { id }, data: { status: "EMITINDO" } });
}

/** numeroNota fica opcional de propósito: o portal não expõe (ou ainda não
 * mapeamos onde expõe) o número da nota logo após a emissão de forma
 * confiável por seletor, e o próprio usuário prefere conferir/recuperar a
 * nota emitida direto no site (menu "Consultar NFS-e") em vez de confiar
 * numa extração automática. O importante aqui é o status EMITIDA + o print
 * de auditoria do momento da emissão. */
export async function marcarEmitida(id: string, numeroNota?: string, urlPdf?: string) {
  return prisma.notaFiscal.update({
    where: { id },
    data: { status: "EMITIDA", numeroNotaEmitida: numeroNota, urlPdfNota: urlPdf, emitidoEm: new Date() },
  });
}

export async function marcarFalha(id: string, mensagem: string) {
  return prisma.notaFiscal.update({
    where: { id },
    data: { status: "FALHOU", erroMensagem: mensagem },
  });
}
