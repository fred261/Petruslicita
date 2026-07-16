-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('ATIVO', 'ENCERRADO', 'RESCINDIDO');

-- CreateEnum
CREATE TYPE "TipoItemCronograma" AS ENUM ('ENTREGA', 'FATURAMENTO');

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "participacaoId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "valorFinal" DECIMAL(16,2) NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3) NOT NULL,
    "status" "StatusContrato" NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_cronograma" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipo" "TipoItemCronograma" NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "valorPrevisto" DECIMAL(16,2),
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "dataConclusao" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_cronograma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratos_participacaoId_key" ON "contratos"("participacaoId");

-- CreateIndex
CREATE INDEX "contratos_vigenciaFim_idx" ON "contratos"("vigenciaFim");

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_participacaoId_fkey" FOREIGN KEY ("participacaoId") REFERENCES "participacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_cronograma" ADD CONSTRAINT "itens_cronograma_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
