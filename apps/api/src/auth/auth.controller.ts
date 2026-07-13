import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { alterarSenhaSchema, loginSchema, refreshSchema } from "@petrus/shared";
import { z } from "zod";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

const totpChallengeSchema = z.object({
  loginChallengeToken: z.string(),
  codigoTotp: z.string().length(6),
});

const totpConfirmSchema = z.object({ codigo: z.string().length(6) });
const totpDisableSchema = z.object({ senha: z.string().min(1) });

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>,
    @Req() req: Request,
  ) {
    return this.authService.login(body.email, body.senha, this.contextoDaRequisicao(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login/2fa")
  async loginComTotp(
    @Body(new ZodValidationPipe(totpChallengeSchema)) body: z.infer<typeof totpChallengeSchema>,
    @Req() req: Request,
  ) {
    return this.authService.loginComTotp(
      body.loginChallengeToken,
      body.codigoTotp,
      this.contextoDaRequisicao(req),
    );
  }

  @Public()
  @Post("refresh")
  async refresh(@Body(new ZodValidationPipe(refreshSchema)) body: z.infer<typeof refreshSchema>) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post("logout")
  async logout(@Body(new ZodValidationPipe(refreshSchema)) body: z.infer<typeof refreshSchema>) {
    await this.authService.logout(body.refreshToken);
    return { ok: true };
  }

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: user.userId } });
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      totpEnabled: usuario.totpEnabled,
    };
  }

  @Post("change-password")
  async alterarSenha(
    @Body(new ZodValidationPipe(alterarSenhaSchema)) body: z.infer<typeof alterarSenhaSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.alterarSenha(user.userId, body.senhaAtual, body.novaSenha);
    return { ok: true };
  }

  @Post("2fa/setup")
  async setupTotp(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.iniciarConfiguracaoTotp(user.userId);
  }

  @Post("2fa/enable")
  async enableTotp(
    @Body(new ZodValidationPipe(totpConfirmSchema)) body: z.infer<typeof totpConfirmSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.confirmarTotp(user.userId, body.codigo);
    return { ok: true };
  }

  @Post("2fa/disable")
  async disableTotp(
    @Body(new ZodValidationPipe(totpDisableSchema)) body: z.infer<typeof totpDisableSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.desativarTotp(user.userId, body.senha);
    return { ok: true };
  }

  private contextoDaRequisicao(req: Request) {
    return {
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    };
  }
}
