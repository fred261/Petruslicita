import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AtualizarClienteCamadaEditavelInput,
  ClienteResponse,
  CriarClienteInput,
  Role,
} from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CnpjLookupService } from "./cnpj-lookup/cnpj-lookup.service";
import { CnpjLookupIndisponivelError, CnpjNaoEncontradoError } from "./cnpj-lookup/cnpj-lookup.types";

interface Autor {
  userId: string;
  papel: Role;
}

@Injectable()
export class ClientesService {
  constructor(
    private prisma: PrismaService,
    private cnpjLookup: CnpjLookupService,
    private audit: AuditService,
  ) {}

  async criar(input: CriarClienteInput, autor: Autor): Promise<ClienteResponse> {
    const existente = await this.prisma.cliente.findUnique({ where: { cnpj: input.cnpj } });
    if (existente) {
      throw new ConflictException("Já existe um cliente cadastrado com este CNPJ.");
    }

    const dadosApi = await this.consultarCnpjOuFalhar(input.cnpj);

    const cliente = await this.prisma.cliente.create({
      data: {
        cnpj: dadosApi.cnpj,
        razaoSocial: dadosApi.razaoSocial,
        nomeFantasia: dadosApi.nomeFantasia,
        cnaePrincipalCodigo: dadosApi.cnaePrincipalCodigo,
        cnaePrincipalDescricao: dadosApi.cnaePrincipalDescricao,
        cnaesSecundarios: dadosApi.cnaesSecundarios,
        situacaoCadastral: dadosApi.situacaoCadastral,
        enderecoLogradouro: dadosApi.endereco.logradouro,
        enderecoNumero: dadosApi.endereco.numero,
        enderecoComplemento: dadosApi.endereco.complemento,
        enderecoBairro: dadosApi.endereco.bairro,
        enderecoMunicipio: dadosApi.endereco.municipio,
        enderecoUf: dadosApi.endereco.uf,
        enderecoCep: dadosApi.endereco.cep,
        dadosApiAtualizadosEm: new Date(),
        palavrasChave: input.palavrasChave ?? [],
        ufsInteresse: input.ufsInteresse ?? [],
        valorMinimoInteresse: input.valorMinimoInteresse ?? null,
        valorMaximoInteresse: input.valorMaximoInteresse ?? null,
        responsavelId: input.responsavelId ?? null,
        status: input.status ?? "ATIVO",
      },
    });

    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Cliente",
      entidadeId: cliente.id,
      acao: "CREATE",
      dadosDepois: { cnpj: cliente.cnpj, razaoSocial: cliente.razaoSocial },
    });

    return this.paraResposta(cliente);
  }

  async listar(autor: Autor): Promise<ClienteResponse[]> {
    const where = autor.papel === "OPERADOR" ? { usuarios: { some: { usuarioId: autor.userId } } } : {};
    const clientes = await this.prisma.cliente.findMany({ where, orderBy: { razaoSocial: "asc" } });
    return clientes.map((c) => this.paraResposta(c));
  }

  async buscarPorId(id: string, autor: Autor): Promise<ClienteResponse> {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new NotFoundException("Cliente não encontrado.");
    await this.garantirAcesso(cliente.id, autor);
    return this.paraResposta(cliente);
  }

  /** Botão "Atualizar dados": reconsulta a API e sobrescreve o bloco travado. */
  async atualizarDadosApi(id: string, autor: Autor): Promise<ClienteResponse> {
    const clienteAtual = await this.prisma.cliente.findUnique({ where: { id } });
    if (!clienteAtual) throw new NotFoundException("Cliente não encontrado.");

    const dadosApi = await this.consultarCnpjOuFalhar(clienteAtual.cnpj);

    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: {
        razaoSocial: dadosApi.razaoSocial,
        nomeFantasia: dadosApi.nomeFantasia,
        cnaePrincipalCodigo: dadosApi.cnaePrincipalCodigo,
        cnaePrincipalDescricao: dadosApi.cnaePrincipalDescricao,
        cnaesSecundarios: dadosApi.cnaesSecundarios,
        situacaoCadastral: dadosApi.situacaoCadastral,
        enderecoLogradouro: dadosApi.endereco.logradouro,
        enderecoNumero: dadosApi.endereco.numero,
        enderecoComplemento: dadosApi.endereco.complemento,
        enderecoBairro: dadosApi.endereco.bairro,
        enderecoMunicipio: dadosApi.endereco.municipio,
        enderecoUf: dadosApi.endereco.uf,
        enderecoCep: dadosApi.endereco.cep,
        dadosApiAtualizadosEm: new Date(),
      },
    });

    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Cliente",
      entidadeId: cliente.id,
      acao: "UPDATE",
      dadosAntes: { razaoSocial: clienteAtual.razaoSocial, situacaoCadastral: clienteAtual.situacaoCadastral },
      dadosDepois: { razaoSocial: cliente.razaoSocial, situacaoCadastral: cliente.situacaoCadastral },
    });

    return this.paraResposta(cliente);
  }

  async atualizarCamadaEditavel(
    id: string,
    input: AtualizarClienteCamadaEditavelInput,
    autor: Autor,
  ): Promise<ClienteResponse> {
    const clienteAtual = await this.prisma.cliente.findUnique({ where: { id } });
    if (!clienteAtual) throw new NotFoundException("Cliente não encontrado.");
    await this.garantirAcesso(id, autor);

    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: {
        palavrasChave: input.palavrasChave,
        ufsInteresse: input.ufsInteresse,
        valorMinimoInteresse: input.valorMinimoInteresse,
        valorMaximoInteresse: input.valorMaximoInteresse,
        responsavelId: input.responsavelId,
        status: input.status,
      },
    });

    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Cliente",
      entidadeId: cliente.id,
      acao: "UPDATE",
      dadosAntes: { status: clienteAtual.status },
      dadosDepois: { status: cliente.status },
    });

    return this.paraResposta(cliente);
  }

  private async consultarCnpjOuFalhar(cnpj: string) {
    try {
      return await this.cnpjLookup.buscar(cnpj);
    } catch (err) {
      if (err instanceof CnpjNaoEncontradoError) {
        throw new BadRequestException(err.message);
      }
      if (err instanceof CnpjLookupIndisponivelError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  private async garantirAcesso(clienteId: string, autor: Autor): Promise<void> {
    if (autor.papel === "MASTER" || autor.papel === "ADMIN") return;
    const vinculo = await this.prisma.usuarioCliente.findUnique({
      where: { usuarioId_clienteId: { usuarioId: autor.userId, clienteId } },
    });
    if (!vinculo) {
      throw new ForbiddenException("Você não tem acesso a este cliente.");
    }
  }

  private paraResposta(cliente: {
    id: string;
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    cnaePrincipalCodigo: string;
    cnaePrincipalDescricao: string;
    cnaesSecundarios: unknown;
    situacaoCadastral: string;
    enderecoLogradouro: string | null;
    enderecoNumero: string | null;
    enderecoComplemento: string | null;
    enderecoBairro: string | null;
    enderecoMunicipio: string | null;
    enderecoUf: string | null;
    enderecoCep: string | null;
    dadosApiAtualizadosEm: Date;
    palavrasChave: unknown;
    ufsInteresse: string[];
    valorMinimoInteresse: unknown;
    valorMaximoInteresse: unknown;
    responsavelId: string | null;
    status: string;
    criadoEm: Date;
  }): ClienteResponse {
    return {
      id: cliente.id,
      cnpj: cliente.cnpj,
      razaoSocial: cliente.razaoSocial,
      nomeFantasia: cliente.nomeFantasia,
      cnaePrincipalCodigo: cliente.cnaePrincipalCodigo,
      cnaePrincipalDescricao: cliente.cnaePrincipalDescricao,
      cnaesSecundarios: cliente.cnaesSecundarios as ClienteResponse["cnaesSecundarios"],
      situacaoCadastral: cliente.situacaoCadastral,
      endereco: {
        logradouro: cliente.enderecoLogradouro,
        numero: cliente.enderecoNumero,
        complemento: cliente.enderecoComplemento,
        bairro: cliente.enderecoBairro,
        municipio: cliente.enderecoMunicipio,
        uf: cliente.enderecoUf,
        cep: cliente.enderecoCep,
      },
      dadosApiAtualizadosEm: cliente.dadosApiAtualizadosEm.toISOString(),
      palavrasChave: cliente.palavrasChave as ClienteResponse["palavrasChave"],
      ufsInteresse: cliente.ufsInteresse as ClienteResponse["ufsInteresse"],
      valorMinimoInteresse: cliente.valorMinimoInteresse === null ? null : Number(cliente.valorMinimoInteresse),
      valorMaximoInteresse: cliente.valorMaximoInteresse === null ? null : Number(cliente.valorMaximoInteresse),
      responsavelId: cliente.responsavelId,
      status: cliente.status as ClienteResponse["status"],
      criadoEm: cliente.criadoEm.toISOString(),
    };
  }
}
