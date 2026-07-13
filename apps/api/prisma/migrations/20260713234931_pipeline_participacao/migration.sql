-- CreateEnum
CREATE TYPE "MotivoPerdaCategoria" AS ENUM ('PRECO_SUPERIOR', 'DESCLASSIFICACAO_TECNICA', 'INABILITACAO_DOCUMENTAL', 'DESISTENCIA_PROPRIA', 'REVOGACAO_ANULACAO', 'OUTRO');

-- AlterTable
ALTER TABLE "participacoes" ADD COLUMN     "concorrenteVencedorCnpj" TEXT,
ADD COLUMN     "concorrenteVencedorNome" TEXT,
ADD COLUMN     "dataDecisao" TIMESTAMP(3),
ADD COLUMN     "diferencaPercentualVencedora" DECIMAL(7,2),
ADD COLUMN     "motivoPerdaCategoria" "MotivoPerdaCategoria",
ADD COLUMN     "motivoPerdaTexto" TEXT,
ADD COLUMN     "proximoPrazo" TIMESTAMP(3),
ADD COLUMN     "valorPropostaVencedora" DECIMAL(16,2),
ADD COLUMN     "valorProposto" DECIMAL(16,2);

-- CreateTable
CREATE TABLE "participacao_itens" (
    "id" TEXT NOT NULL,
    "participacaoId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participacao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "participacaoId" TEXT NOT NULL,
    "autorId" TEXT,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participacao_itens_participacaoId_itemId_key" ON "participacao_itens"("participacaoId", "itemId");

-- CreateIndex
CREATE INDEX "comentarios_participacaoId_idx" ON "comentarios"("participacaoId");

-- CreateIndex
CREATE INDEX "participacoes_proximoPrazo_idx" ON "participacoes"("proximoPrazo");

-- AddForeignKey
ALTER TABLE "participacao_itens" ADD CONSTRAINT "participacao_itens_participacaoId_fkey" FOREIGN KEY ("participacaoId") REFERENCES "participacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao_itens" ADD CONSTRAINT "participacao_itens_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_participacaoId_fkey" FOREIGN KEY ("participacaoId") REFERENCES "participacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
