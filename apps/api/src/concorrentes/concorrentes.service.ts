import { Injectable, NotFoundException } from "@nestjs/common";
import type { ConcorrenteDetalhe, ConcorrenteResumo, DisputaConcorrente, Role } from "@petrus/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface Autor {
  userId: string;
  papel: Role;
}

const DISPUTA_INCLUDE = {
  cliente: { select: { id: true, razaoSocial: true } },
  licitacao: {
    select: { id: true, numeroProcesso: true, orgaoNome: true, objeto: true, modalidadeNome: true },
  },
} satisfies Prisma.ParticipacaoInclude;

type Disputa = Prisma.ParticipacaoGetPayload<{ include: typeof DISPUTA_INCLUDE }>;

@Injectable()
export class ConcorrentesService {
  constructor(private prisma: PrismaService) {}

  async listar(autor: Autor): Promise<ConcorrenteResumo[]> {
    const disputas = await this.buscarDisputas(autor);
    const grupos = this.agrupar(disputas);
    return Array.from(grupos.entries())
      .map(([chave, grupo]) => this.montarResumo(chave, grupo))
      .sort((a, b) => b.totalDisputas - a.totalDisputas);
  }

  async detalhar(chaveCodificada: string, autor: Autor): Promise<ConcorrenteDetalhe> {
    const chaveAlvo = this.decodificarChave(chaveCodificada);
    const disputas = await this.buscarDisputas(autor);
    const grupo = disputas.filter((p) => this.chaveDe(p) === chaveAlvo);
    if (grupo.length === 0) throw new NotFoundException("Concorrente não encontrado.");
    return this.montarDetalhe(chaveAlvo, grupo);
  }

  private async buscarDisputas(autor: Autor): Promise<Disputa[]> {
    const where: Prisma.ParticipacaoWhereInput = {
      status: "NAO_VENCEDORA",
      concorrenteVencedorNome: { not: null },
    };
    if (autor.papel === "OPERADOR") {
      where.cliente = { usuarios: { some: { usuarioId: autor.userId } } };
    }
    return this.prisma.participacao.findMany({
      where,
      include: DISPUTA_INCLUDE,
      orderBy: { dataDecisao: "desc" },
    });
  }

  private agrupar(disputas: Disputa[]): Map<string, Disputa[]> {
    const grupos = new Map<string, Disputa[]>();
    for (const disputa of disputas) {
      const chave = this.chaveDe(disputa);
      const grupo = grupos.get(chave) ?? [];
      grupo.push(disputa);
      grupos.set(chave, grupo);
    }
    return grupos;
  }

  private chaveDe(disputa: Disputa): string {
    const cnpj = disputa.concorrenteVencedorCnpj?.replace(/\D/g, "");
    if (cnpj) return `cnpj:${cnpj}`;
    return `nome:${disputa.concorrenteVencedorNome!.trim().toLowerCase()}`;
  }

  private codificarChave(chave: string): string {
    return Buffer.from(chave, "utf8").toString("base64url");
  }

  private decodificarChave(chaveCodificada: string): string {
    return Buffer.from(chaveCodificada, "base64url").toString("utf8");
  }

  private montarResumo(chave: string, grupo: Disputa[]): ConcorrenteResumo {
    const percentuais = grupo
      .map((d) => d.diferencaPercentualVencedora)
      .filter((v): v is Prisma.Decimal => v !== null)
      .map((v) => Number(v));
    const datas = grupo.map((d) => d.dataDecisao).filter((d): d is Date => d !== null);

    return {
      chave: this.codificarChave(chave),
      nome: grupo[0].concorrenteVencedorNome!,
      cnpj: grupo.find((d) => d.concorrenteVencedorCnpj)?.concorrenteVencedorCnpj ?? null,
      totalDisputas: grupo.length,
      clientesAfetados: new Set(grupo.map((d) => d.clienteId)).size,
      valorMedioPercentualDiferenca: percentuais.length ? this.media(percentuais) : null,
      ultimaDisputaEm: datas.length
        ? new Date(Math.max(...datas.map((d) => d.getTime()))).toISOString()
        : null,
    };
  }

  private montarDetalhe(chave: string, grupo: Disputa[]): ConcorrenteDetalhe {
    const percentuais = grupo
      .map((d) => d.diferencaPercentualVencedora)
      .filter((v): v is Prisma.Decimal => v !== null)
      .map((v) => Number(v));

    const disputas: DisputaConcorrente[] = grupo.map((d) => ({
      participacaoId: d.id,
      clienteId: d.clienteId,
      clienteRazaoSocial: d.cliente.razaoSocial,
      licitacaoId: d.licitacaoId,
      licitacaoNumeroProcesso: d.licitacao.numeroProcesso,
      licitacaoOrgaoNome: d.licitacao.orgaoNome,
      licitacaoObjeto: d.licitacao.objeto,
      licitacaoModalidadeNome: d.licitacao.modalidadeNome,
      valorProposto: d.valorProposto ? Number(d.valorProposto) : null,
      valorPropostaVencedora: d.valorPropostaVencedora ? Number(d.valorPropostaVencedora) : null,
      diferencaPercentual: d.diferencaPercentualVencedora ? Number(d.diferencaPercentualVencedora) : null,
      dataDecisao: d.dataDecisao?.toISOString() ?? null,
    }));

    return {
      chave: this.codificarChave(chave),
      nome: grupo[0].concorrenteVencedorNome!,
      cnpj: grupo.find((d) => d.concorrenteVencedorCnpj)?.concorrenteVencedorCnpj ?? null,
      totalDisputas: grupo.length,
      valorMedioPercentualDiferenca: percentuais.length ? this.media(percentuais) : null,
      valorTotalPropostasVencedoras: this.arredondar(
        grupo.reduce((soma, d) => soma + (d.valorPropostaVencedora ? Number(d.valorPropostaVencedora) : 0), 0),
      ),
      disputas,
    };
  }

  private media(valores: number[]): number {
    return this.arredondar(valores.reduce((a, b) => a + b, 0) / valores.length);
  }

  private arredondar(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}
