import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";

@Injectable()
export class TotpService {
  constructor(private config: ConfigService) {}

  gerarSegredo(): string {
    return authenticator.generateSecret();
  }

  async gerarQrCodeDataUrl(email: string, segredo: string): Promise<string> {
    const issuer = this.config.get<string>("TOTP_ISSUER") ?? "Petrus Licitação";
    const otpauthUrl = authenticator.keyuri(email, issuer, segredo);
    return QRCode.toDataURL(otpauthUrl);
  }

  verificar(codigo: string, segredo: string): boolean {
    return authenticator.check(codigo, segredo);
  }
}
