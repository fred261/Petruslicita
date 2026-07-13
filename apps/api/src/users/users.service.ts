import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import type { AtualizarUsuarioInput, CriarUsuarioInput, Role, UsuarioResponse } from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

/** Papéis que só o Master pode criar/editar/excluir (ver tabela de perfis da spec). */
const PAPEIS_RESTRITOS_AO_MASTER: Role[] = ["MASTER", "ADMIN"];

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async criar(input: CriarUsuarioInput, autor: { userId: string; papel: Role }): Promise<UsuarioResponse> {
    this.garantirPermissaoSobrePapel(autor.papel, input.papel);

    if ((input.papel === "OPERADOR" || input.papel === "EMPRESA") && input.clienteIds.length === 0) {
      throw new BadRequestException(
        "Informe ao menos um cliente vinculado para usuários Operador ou Empresa.",
      );
    }

    const existente = await this.prisma.usuario.findUnique({ where: { email: input.email } });
    if (existente) {
      throw new ConflictException("Já existe um usuário com este e-mail.");
    }

    const senhaHash = await argon2.hash(input.senha);
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: input.nome,
        email: input.email,
        papel: input.papel,
        senhaHash,
        clientes: {
          create: input.clienteIds.map((clienteId) => ({ clienteId })),
        },
      },
      include: { clientes: true },
    });

    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "CREATE",
      dadosDepois: { nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    });

    return this.paraResposta(usuario);
  }

  async listar(autor: { papel: Role }): Promise<UsuarioResponse[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: autor.papel === "MASTER" ? {} : { papel: { notIn: PAPEIS_RESTRITOS_AO_MASTER } },
      include: { clientes: true },
      orderBy: { nome: "asc" },
    });
    return usuarios.map((u) => this.paraResposta(u));
  }

  async buscarPorId(id: string): Promise<UsuarioResponse> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, include: { clientes: true } });
    if (!usuario) throw new NotFoundException("Usuário não encontrado.");
    return this.paraResposta(usuario);
  }

  async atualizar(
    id: string,
    input: AtualizarUsuarioInput,
    autor: { userId: string; papel: Role },
  ): Promise<UsuarioResponse> {
    const usuarioAtual = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuarioAtual) throw new NotFoundException("Usuário não encontrado.");

    this.garantirPermissaoSobrePapel(autor.papel, usuarioAtual.papel);
    if (input.papel) {
      this.garantirPermissaoSobrePapel(autor.papel, input.papel);
    }

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        nome: input.nome,
        papel: input.papel,
        ativo: input.ativo,
        ...(input.clienteIds
          ? {
              clientes: {
                deleteMany: {},
                create: input.clienteIds.map((clienteId) => ({ clienteId })),
              },
            }
          : {}),
      },
      include: { clientes: true },
    });

    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Usuario",
      entidadeId: usuario.id,
      acao: "UPDATE",
      dadosAntes: { nome: usuarioAtual.nome, papel: usuarioAtual.papel, ativo: usuarioAtual.ativo },
      dadosDepois: { nome: usuario.nome, papel: usuario.papel, ativo: usuario.ativo },
    });

    return this.paraResposta(usuario);
  }

  async redefinirSenha(id: string, novaSenha: string, autor: { userId: string; papel: Role }): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException("Usuário não encontrado.");
    this.garantirPermissaoSobrePapel(autor.papel, usuario.papel);

    const senhaHash = await argon2.hash(novaSenha);
    await this.prisma.usuario.update({
      where: { id },
      data: { senhaHash, tentativasFalhas: 0, bloqueadoAte: null },
    });
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId: id, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Usuario",
      entidadeId: id,
      acao: "UPDATE",
      dadosDepois: { acao: "senha_redefinida_pelo_administrador" },
    });
  }

  /** Exclusão permanente — reservada ao Master, conforme spec. */
  async excluir(id: string, autor: { userId: string }): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException("Usuário não encontrado.");

    await this.prisma.usuario.delete({ where: { id } });
    await this.audit.registrar({
      usuarioId: autor.userId,
      entidade: "Usuario",
      entidadeId: id,
      acao: "DELETE",
      dadosAntes: { nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    });
  }

  private garantirPermissaoSobrePapel(papelAutor: Role, papelAlvo: Role): void {
    if (papelAutor === "MASTER") return;
    if (papelAutor === "ADMIN" && !PAPEIS_RESTRITOS_AO_MASTER.includes(papelAlvo)) return;
    throw new ForbiddenException("Você não tem permissão para gerenciar usuários deste perfil.");
  }

  private paraResposta(usuario: {
    id: string;
    nome: string;
    email: string;
    papel: Role;
    ativo: boolean;
    totpEnabled: boolean;
    criadoEm: Date;
    ultimoAcessoEm: Date | null;
    clientes: { clienteId: string }[];
  }): UsuarioResponse {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      ativo: usuario.ativo,
      totpEnabled: usuario.totpEnabled,
      clienteIds: usuario.clientes.map((c) => c.clienteId),
      criadoEm: usuario.criadoEm.toISOString(),
      ultimoAcessoEm: usuario.ultimoAcessoEm?.toISOString() ?? null,
    };
  }
}
