import { Injectable } from "@nestjs/common";
import type { ConfiguracaoSistemaInput, ConfiguracaoSistemaResponse } from "@petrus/shared";
import { PrismaService } from "../prisma/prisma.service";

const ID_UNICO = "default";

@Injectable()
export class ConfiguracaoService {
  constructor(private prisma: PrismaService) {}

  async obter(): Promise<ConfiguracaoSistemaResponse> {
    const config = await this.prisma.configuracaoSistema.upsert({
      where: { id: ID_UNICO },
      create: { id: ID_UNICO },
      update: {},
    });
    return this.paraResposta(config);
  }

  async atualizar(input: ConfiguracaoSistemaInput): Promise<ConfiguracaoSistemaResponse> {
    const config = await this.prisma.configuracaoSistema.upsert({
      where: { id: ID_UNICO },
      create: { id: ID_UNICO, ...input },
      update: input,
    });
    return this.paraResposta(config);
  }

  private paraResposta(config: {
    diasAntecedenciaPrazo: number;
    intervaloCobrancaSemPrazoHoras: number;
    toleranciaEscalonamentoHoras: number;
    atualizadoEm: Date;
  }): ConfiguracaoSistemaResponse {
    return {
      diasAntecedenciaPrazo: config.diasAntecedenciaPrazo,
      intervaloCobrancaSemPrazoHoras: config.intervaloCobrancaSemPrazoHoras,
      toleranciaEscalonamentoHoras: config.toleranciaEscalonamentoHoras,
      atualizadoEm: config.atualizadoEm.toISOString(),
    };
  }
}
