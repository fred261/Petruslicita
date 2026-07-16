-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('EMAIL');

-- CreateTable
CREATE TABLE "configuracoes_sistema" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "diasAntecedenciaPrazo" INTEGER NOT NULL DEFAULT 3,
    "intervaloCobrancaSemPrazoHoras" INTEGER NOT NULL DEFAULT 168,
    "toleranciaEscalonamentoHoras" INTEGER NOT NULL DEFAULT 48,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "canal" "CanalNotificacao" NOT NULL DEFAULT 'EMAIL',
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "participacaoId" TEXT,
    "enviadaEm" TIMESTAMP(3),
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacoes_participacaoId_tipo_idx" ON "notificacoes"("participacaoId", "tipo");

-- CreateIndex
CREATE INDEX "notificacoes_destinatarioId_idx" ON "notificacoes"("destinatarioId");

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
