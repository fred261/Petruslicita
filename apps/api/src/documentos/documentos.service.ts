import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as crypto from "node:crypto";
import type { DocumentoResponse, Role } from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { STORAGE_ADAPTER } from "./documentos.constants";
import type { StorageAdapter } from "./storage-adapters/storage-adapter.types";

interface Autor {
  userId: string;
  papel: Role;
}

interface UploadInput {
  tipo: string;
  dataEmissao?: string;
  dataValidade?: string;
  clienteId?: string;
  participacaoId?: string;
}

@Injectable()
export class DocumentosService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(STORAGE_ADAPTER) private storage: StorageAdapter,
  ) {}

  async upload(
    input: UploadInput,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    autor: Autor,
  ): Promise<DocumentoResponse> {
    if (!input.clienteId === !input.participacaoId) {
      throw new BadRequestException("Informe exatamente um vínculo: cliente ou participação.");
    }

    const clienteId = input.clienteId ?? (await this.clienteDaParticipacao(input.participacaoId!));
    await this.garantirAcessoAoCliente(clienteId, autor);

    const chave = `${clienteId}/${crypto.randomUUID()}-${sanitizarNomeArquivo(file.originalname)}`;
    await this.storage.salvar(chave, file.buffer, file.mimetype);

    const documento = await this.prisma.documento.create({
      data: {
        tipo: input.tipo,
        nomeArquivo: file.originalname,
        mimeType: file.mimetype,
        tamanhoBytes: file.size,
        caminhoArmazenamento: chave,
        dataEmissao: input.dataEmissao ? new Date(input.dataEmissao) : null,
        dataValidade: input.dataValidade ? new Date(input.dataValidade) : null,
        clienteId: input.clienteId ?? null,
        participacaoId: input.participacaoId ?? null,
        uploadedById: autor.userId,
      },
      include: { uploadedBy: true },
    });

    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Documento",
      entidadeId: documento.id,
      acao: "CREATE",
      dadosDepois: { tipo: documento.tipo, nomeArquivo: documento.nomeArquivo },
    });

    return this.paraResposta(documento);
  }

  async listar(filtro: { clienteId?: string; participacaoId?: string }, autor: Autor): Promise<DocumentoResponse[]> {
    if (!filtro.clienteId === !filtro.participacaoId) {
      throw new BadRequestException("Informe exatamente um filtro: cliente ou participação.");
    }
    const clienteId = filtro.clienteId ?? (await this.clienteDaParticipacao(filtro.participacaoId!));
    await this.garantirAcessoAoCliente(clienteId, autor);

    const documentos = await this.prisma.documento.findMany({
      where: { clienteId: filtro.clienteId, participacaoId: filtro.participacaoId },
      include: { uploadedBy: true },
      orderBy: { criadoEm: "desc" },
    });
    return documentos.map((d) => this.paraResposta(d));
  }

  async buscarArquivo(
    id: string,
    autor: Autor,
  ): Promise<{ buffer: Buffer; mimeType: string; nomeArquivo: string }> {
    const documento = await this.prisma.documento.findUnique({ where: { id } });
    if (!documento) throw new NotFoundException("Documento não encontrado.");

    const clienteId = documento.clienteId ?? (await this.clienteDaParticipacao(documento.participacaoId!));
    await this.garantirAcessoAoCliente(clienteId, autor);

    const buffer = await this.storage.ler(documento.caminhoArmazenamento);
    return { buffer, mimeType: documento.mimeType, nomeArquivo: documento.nomeArquivo };
  }

  async remover(id: string, autor: Autor): Promise<void> {
    const documento = await this.prisma.documento.findUnique({ where: { id } });
    if (!documento) throw new NotFoundException("Documento não encontrado.");

    await this.storage.remover(documento.caminhoArmazenamento);
    await this.prisma.documento.delete({ where: { id } });

    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Documento",
      entidadeId: id,
      acao: "DELETE",
      dadosAntes: { tipo: documento.tipo, nomeArquivo: documento.nomeArquivo },
    });
  }

  private async clienteDaParticipacao(participacaoId: string): Promise<string> {
    const participacao = await this.prisma.participacao.findUnique({ where: { id: participacaoId } });
    if (!participacao) throw new NotFoundException("Participação não encontrada.");
    return participacao.clienteId;
  }

  private async garantirAcessoAoCliente(clienteId: string, autor: Autor): Promise<void> {
    if (autor.papel === "MASTER" || autor.papel === "ADMIN") return;
    const vinculo = await this.prisma.usuarioCliente.findUnique({
      where: { usuarioId_clienteId: { usuarioId: autor.userId, clienteId } },
    });
    if (!vinculo) {
      throw new ForbiddenException("Você não tem acesso a este cliente.");
    }
  }

  private paraResposta(documento: {
    id: string;
    tipo: string;
    nomeArquivo: string;
    mimeType: string;
    tamanhoBytes: number;
    dataEmissao: Date | null;
    dataValidade: Date | null;
    clienteId: string | null;
    participacaoId: string | null;
    uploadedBy: { nome: string } | null;
    criadoEm: Date;
  }): DocumentoResponse {
    const agora = new Date();
    const status: DocumentoResponse["status"] = !documento.dataValidade
      ? "SEM_VALIDADE"
      : documento.dataValidade < agora
        ? "VENCIDO"
        : "VALIDO";

    return {
      id: documento.id,
      tipo: documento.tipo,
      nomeArquivo: documento.nomeArquivo,
      mimeType: documento.mimeType,
      tamanhoBytes: documento.tamanhoBytes,
      dataEmissao: documento.dataEmissao?.toISOString() ?? null,
      dataValidade: documento.dataValidade?.toISOString() ?? null,
      status,
      clienteId: documento.clienteId,
      participacaoId: documento.participacaoId,
      uploadedByNome: documento.uploadedBy?.nome ?? null,
      criadoEm: documento.criadoEm.toISOString(),
    };
  }
}

function sanitizarNomeArquivo(nome: string): string {
  return nome.replace(/[^a-zA-Z0-9._-]/g, "_");
}
