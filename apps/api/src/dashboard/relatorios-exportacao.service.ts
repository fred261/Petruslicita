import { ForbiddenException, Injectable } from "@nestjs/common";
import type {
  ConsolidadoResponse,
  ExportarRelatorioInput,
  FunilResponse,
  IndicadoresClienteResponse,
  Role,
} from "@petrus/shared";
import { FASE_FUNIL_LABELS, STATUS_PARTICIPACAO_LABELS } from "@petrus/shared";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardService } from "./dashboard.service";

interface Autor {
  userId: string;
  papel: Role;
}

interface Relatorio {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

@Injectable()
export class RelatoriosExportacaoService {
  constructor(
    private prisma: PrismaService,
    private dashboard: DashboardService,
  ) {}

  async gerar(input: ExportarRelatorioInput, autor: Autor): Promise<Relatorio> {
    if (input.tipo === "CONSOLIDADO" && autor.papel !== "MASTER" && autor.papel !== "ADMIN") {
      throw new ForbiddenException("Apenas Master/Admin podem exportar o relatório consolidado do escritório.");
    }

    const filtro = {
      clienteId: input.clienteId,
      responsavelId: input.responsavelId,
      dataInicio: input.dataInicio,
      dataFim: input.dataFim,
    };

    if (input.tipo === "FUNIL") {
      const dados = await this.dashboard.funil(filtro, autor);
      const buffer =
        input.formato === "PDF" ? await this.pdfFunil(dados) : await this.xlsxFunil(dados);
      return { buffer, filename: `funil.${input.formato.toLowerCase()}`, mimeType: this.mime(input.formato) };
    }

    if (input.tipo === "INDICADORES_CLIENTE") {
      const clientes = await this.coletarIndicadoresClientes(input.clienteId, autor);
      const buffer =
        input.formato === "PDF" ? await this.pdfIndicadores(clientes) : await this.xlsxIndicadores(clientes);
      return {
        buffer,
        filename: `indicadores-cliente.${input.formato.toLowerCase()}`,
        mimeType: this.mime(input.formato),
      };
    }

    const dados = await this.dashboard.consolidado(filtro, autor);
    const buffer = input.formato === "PDF" ? await this.pdfConsolidado(dados) : await this.xlsxConsolidado(dados);
    return { buffer, filename: `consolidado.${input.formato.toLowerCase()}`, mimeType: this.mime(input.formato) };
  }

  private async coletarIndicadoresClientes(
    clienteId: string | undefined,
    autor: Autor,
  ): Promise<IndicadoresClienteResponse[]> {
    if (clienteId) {
      return [await this.dashboard.indicadoresPorCliente(clienteId, autor)];
    }

    const where = autor.papel === "OPERADOR" ? { usuarios: { some: { usuarioId: autor.userId } } } : {};
    const clientes = await this.prisma.cliente.findMany({ where, orderBy: { razaoSocial: "asc" } });
    const resultados: IndicadoresClienteResponse[] = [];
    for (const cliente of clientes) {
      resultados.push(await this.dashboard.indicadoresPorCliente(cliente.id, autor));
    }
    return resultados;
  }

  private mime(formato: ExportarRelatorioInput["formato"]): string {
    return formato === "PDF"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  // --- PDF ---

  private async pdfFunil(dados: FunilResponse): Promise<Buffer> {
    return this.montarPdf((doc) => {
      doc.fontSize(18).text("Funil de Participações", { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(`Total geral: ${dados.totalGeral}`);
      doc.text(`Taxa de sucesso: ${dados.taxaSucesso !== null ? `${dados.taxaSucesso}%` : "—"}`);
      doc.moveDown();
      for (const fase of dados.fases) {
        doc.fontSize(13).text(`${FASE_FUNIL_LABELS[fase.fase]} — ${fase.total}`);
        doc.fontSize(10);
        for (const [status, total] of Object.entries(fase.porStatus)) {
          doc.text(`  ${STATUS_PARTICIPACAO_LABELS[status as keyof typeof STATUS_PARTICIPACAO_LABELS]}: ${total}`);
        }
        doc.moveDown(0.5);
      }
    });
  }

  private async pdfIndicadores(clientes: IndicadoresClienteResponse[]): Promise<Buffer> {
    return this.montarPdf((doc) => {
      doc.fontSize(18).text("Indicadores por Cliente", { underline: true });
      doc.moveDown();
      for (const c of clientes) {
        doc.fontSize(13).text(c.clienteRazaoSocial);
        doc
          .fontSize(10)
          .text(`  Participações: ${c.totalParticipacoes} (ativas: ${c.participacoesAtivas})`)
          .text(`  Vencidas: ${c.vencidas} | Não vencidas: ${c.naoVencidas} | Descartadas: ${c.descartadas}`)
          .text(`  Taxa de sucesso: ${c.taxaSucesso !== null ? `${c.taxaSucesso}%` : "—"}`)
          .text(`  Valor proposto (total): ${MOEDA.format(c.valorTotalProposto)}`)
          .text(`  Valor contratado (total): ${MOEDA.format(c.valorTotalContratado)}`)
          .text(`  Contratos ativos: ${c.contratosAtivos}`);
        doc.moveDown();
      }
    });
  }

  private async pdfConsolidado(dados: ConsolidadoResponse): Promise<Buffer> {
    return this.montarPdf((doc) => {
      doc.fontSize(18).text("Consolidado do Escritório", { underline: true });
      doc.moveDown();
      doc
        .fontSize(11)
        .text(`Clientes: ${dados.totalClientes}`)
        .text(`Participações: ${dados.totalParticipacoes} (ativas: ${dados.participacoesAtivas})`)
        .text(`Taxa de sucesso: ${dados.taxaSucesso !== null ? `${dados.taxaSucesso}%` : "—"}`)
        .text(`Valor total contratado: ${MOEDA.format(dados.valorTotalContratado)}`)
        .text(`Contratos ativos: ${dados.contratosAtivos}`);
      doc.moveDown();

      doc.fontSize(14).text("Funil");
      doc.fontSize(10);
      for (const fase of dados.funil.fases) {
        doc.text(`  ${FASE_FUNIL_LABELS[fase.fase]}: ${fase.total}`);
      }
      doc.moveDown();

      doc.fontSize(14).text("Ranking de clientes por valor contratado");
      doc.fontSize(10);
      for (const c of dados.rankingClientes) {
        doc.text(
          `  ${c.clienteRazaoSocial} — ${MOEDA.format(c.valorTotalContratado)} (${c.totalParticipacoes} participações, ${
            c.taxaSucesso !== null ? `${c.taxaSucesso}%` : "—"
          } sucesso)`,
        );
      }
    });
  }

  private montarPdf(desenhar: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      desenhar(doc);
      doc.end();
    });
  }

  // --- Excel ---

  private async xlsxFunil(dados: FunilResponse): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Funil");
    sheet.addRow(["Fase", "Status", "Total"]);
    for (const fase of dados.fases) {
      for (const [status, total] of Object.entries(fase.porStatus)) {
        sheet.addRow([
          FASE_FUNIL_LABELS[fase.fase],
          STATUS_PARTICIPACAO_LABELS[status as keyof typeof STATUS_PARTICIPACAO_LABELS],
          total,
        ]);
      }
    }
    sheet.addRow([]);
    sheet.addRow(["Total geral", "", dados.totalGeral]);
    sheet.addRow(["Taxa de sucesso", "", dados.taxaSucesso !== null ? `${dados.taxaSucesso}%` : "—"]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => (col.width = 28));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async xlsxIndicadores(clientes: IndicadoresClienteResponse[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Indicadores por Cliente");
    sheet.addRow([
      "Cliente",
      "Participações",
      "Ativas",
      "Vencidas",
      "Não vencidas",
      "Descartadas",
      "Taxa de sucesso (%)",
      "Valor proposto (R$)",
      "Valor contratado (R$)",
      "Contratos ativos",
    ]);
    for (const c of clientes) {
      sheet.addRow([
        c.clienteRazaoSocial,
        c.totalParticipacoes,
        c.participacoesAtivas,
        c.vencidas,
        c.naoVencidas,
        c.descartadas,
        c.taxaSucesso ?? "—",
        c.valorTotalProposto,
        c.valorTotalContratado,
        c.contratosAtivos,
      ]);
    }
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => (col.width = 20));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async xlsxConsolidado(dados: ConsolidadoResponse): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const resumo = workbook.addWorksheet("Resumo");
    resumo.addRow(["Clientes", dados.totalClientes]);
    resumo.addRow(["Participações", dados.totalParticipacoes]);
    resumo.addRow(["Participações ativas", dados.participacoesAtivas]);
    resumo.addRow(["Taxa de sucesso (%)", dados.taxaSucesso ?? "—"]);
    resumo.addRow(["Valor total contratado (R$)", dados.valorTotalContratado]);
    resumo.addRow(["Contratos ativos", dados.contratosAtivos]);
    resumo.columns.forEach((col) => (col.width = 28));

    const funilSheet = workbook.addWorksheet("Funil");
    funilSheet.addRow(["Fase", "Status", "Total"]);
    for (const fase of dados.funil.fases) {
      for (const [status, total] of Object.entries(fase.porStatus)) {
        funilSheet.addRow([
          FASE_FUNIL_LABELS[fase.fase],
          STATUS_PARTICIPACAO_LABELS[status as keyof typeof STATUS_PARTICIPACAO_LABELS],
          total,
        ]);
      }
    }
    funilSheet.getRow(1).font = { bold: true };
    funilSheet.columns.forEach((col) => (col.width = 28));

    const ranking = workbook.addWorksheet("Ranking de Clientes");
    ranking.addRow(["Cliente", "Participações", "Valor contratado (R$)", "Taxa de sucesso (%)"]);
    for (const c of dados.rankingClientes) {
      ranking.addRow([c.clienteRazaoSocial, c.totalParticipacoes, c.valorTotalContratado, c.taxaSucesso ?? "—"]);
    }
    ranking.getRow(1).font = { bold: true };
    ranking.columns.forEach((col) => (col.width = 24));

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
