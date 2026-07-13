import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import * as crypto from "node:crypto";
import type { Role } from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";
import { TotpService } from "./totp.service";

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  papel: Role;
  totpEnabled: boolean;
}

const LOGIN_CHALLENGE_PURPOSE = "2fa-challenge";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private totp: TotpService,
  ) {}

  async login(email: string, senha: string, ctx: RequestContext) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    // Mensagem genérica em qualquer caminho de falha, para não permitir enumeração de e-mails.
    const credenciaisInvalidas = () =>
      new UnauthorizedException("E-mail ou senha inválidos.");

    if (!usuario || !usuario.ativo) {
      await this.registrarAcesso(null, email, ctx, false, "usuario_inexistente_ou_inativo");
      throw credenciaisInvalidas();
    }

    if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      await this.registrarAcesso(usuario.id, email, ctx, false, "conta_bloqueada");
      throw new ForbiddenException(
        "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.",
      );
    }

    const senhaValida = await argon2.verify(usuario.senhaHash, senha).catch(() => false);
    if (!senhaValida) {
      await this.registrarTentativaFalha(usuario.id);
      await this.registrarAcesso(usuario.id, email, ctx, false, "senha_incorreta");
      throw credenciaisInvalidas();
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { tentativasFalhas: 0, bloqueadoAte: null },
    });

    if (usuario.totpEnabled) {
      const loginChallengeToken = this.jwt.sign(
        { sub: usuario.id, purpose: LOGIN_CHALLENGE_PURPOSE },
        { secret: this.config.get<string>("JWT_ACCESS_SECRET"), expiresIn: "5m" },
      );
      return { status: "2FA_REQUIRED" as const, loginChallengeToken };
    }

    return this.finalizarLogin(usuario, ctx);
  }

  async loginComTotp(loginChallengeToken: string, codigoTotp: string, ctx: RequestContext) {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwt.verify(loginChallengeToken, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Desafio de login expirado. Faça login novamente.");
    }
    if (payload.purpose !== LOGIN_CHALLENGE_PURPOSE) {
      throw new UnauthorizedException("Token de desafio inválido.");
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!usuario || !usuario.ativo || !usuario.totpEnabled || !usuario.totpSecret) {
      throw new UnauthorizedException("Não foi possível concluir o login.");
    }

    const codigoValido = this.totp.verificar(codigoTotp, usuario.totpSecret);
    if (!codigoValido) {
      await this.registrarTentativaFalha(usuario.id);
      await this.registrarAcesso(usuario.id, usuario.email, ctx, false, "totp_incorreto");
      throw new UnauthorizedException("Código de verificação inválido.");
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { tentativasFalhas: 0, bloqueadoAte: null },
    });

    return this.finalizarLogin(usuario, ctx);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
    }

    const tokenHash = this.hashToken(refreshToken);
    const registro = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!registro || registro.revogadoEm || registro.expiraEm < new Date()) {
      throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
    }

    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revogadoEm: new Date() },
    });

    return this.emitirTokens(usuario);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken
      .updateMany({
        where: { tokenHash, revogadoEm: null },
        data: { revogadoEm: new Date() },
      })
      .catch(() => undefined);
  }

  async alterarSenha(usuarioId: string, senhaAtual: string, novaSenha: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    const senhaValida = await argon2.verify(usuario.senhaHash, senhaAtual).catch(() => false);
    if (!senhaValida) {
      throw new UnauthorizedException("Senha atual incorreta.");
    }
    const senhaHash = await argon2.hash(novaSenha);
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
    // Revoga todas as sessões ativas ao trocar a senha.
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
  }

  async iniciarConfiguracaoTotp(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    const segredo = this.totp.gerarSegredo();
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { totpSecret: segredo, totpEnabled: false },
    });
    const qrCodeDataUrl = await this.totp.gerarQrCodeDataUrl(usuario.email, segredo);
    return { segredo, qrCodeDataUrl };
  }

  async confirmarTotp(usuarioId: string, codigo: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    if (!usuario.totpSecret) {
      throw new UnauthorizedException("Configuração de 2FA não iniciada.");
    }
    if (!this.totp.verificar(codigo, usuario.totpSecret)) {
      throw new UnauthorizedException("Código de verificação inválido.");
    }
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { totpEnabled: true } });
  }

  async desativarTotp(usuarioId: string, senha: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    const senhaValida = await argon2.verify(usuario.senhaHash, senha).catch(() => false);
    if (!senhaValida) {
      throw new UnauthorizedException("Senha incorreta.");
    }
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { totpEnabled: false, totpSecret: null },
    });
  }

  private async finalizarLogin(
    usuario: { id: string; nome: string; email: string; papel: Role; totpEnabled: boolean },
    ctx: RequestContext,
  ) {
    const tokens = await this.emitirTokens(usuario);
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcessoEm: new Date() },
    });
    await this.registrarAcesso(usuario.id, usuario.email, ctx, true, null);

    const usuarioPublico: UsuarioPublico = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      totpEnabled: usuario.totpEnabled,
    };
    return { status: "OK" as const, ...tokens, usuario: usuarioPublico };
  }

  private async emitirTokens(usuario: { id: string; email: string; papel: Role }): Promise<TokenPair> {
    const accessToken = this.jwt.sign(
      { sub: usuario.id, email: usuario.email, papel: usuario.papel },
      {
        secret: this.config.get<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get<string>("JWT_ACCESS_EXPIRES_IN"),
      },
    );

    const jti = crypto.randomUUID();
    const refreshExpiresIn = this.config.get<string>("JWT_REFRESH_EXPIRES_IN")!;
    const refreshToken = this.jwt.sign(
      { sub: usuario.id, jti },
      { secret: this.config.get<string>("JWT_REFRESH_SECRET"), expiresIn: refreshExpiresIn },
    );

    await this.prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: this.hashToken(refreshToken),
        expiraEm: new Date(Date.now() + this.parseDurationMs(refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken };
  }

  private async registrarTentativaFalha(usuarioId: string): Promise<void> {
    const maxTentativas = this.config.get<number>("LOGIN_MAX_FAILED_ATTEMPTS")!;
    const lockoutMinutos = this.config.get<number>("LOGIN_LOCKOUT_MINUTES")!;

    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { tentativasFalhas: { increment: 1 } },
    });

    if (usuario.tentativasFalhas >= maxTentativas) {
      await this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { bloqueadoAte: new Date(Date.now() + lockoutMinutos * 60_000) },
      });
    }
  }

  private async registrarAcesso(
    usuarioId: string | null,
    email: string,
    ctx: RequestContext,
    sucesso: boolean,
    motivo: string | null,
  ): Promise<void> {
    await this.prisma.accessLog.create({
      data: {
        usuarioId,
        email,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        sucesso,
        motivo,
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
    return value * unitMs;
  }
}
