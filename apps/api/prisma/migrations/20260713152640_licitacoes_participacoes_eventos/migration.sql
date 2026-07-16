-- CreateEnum
CREATE TYPE "FonteLicitacao" AS ENUM ('PNCP', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrigemItem" AS ENUM ('AUTO_IMPORTADO', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrigemParticipacao" AS ENUM ('SUGESTAO_MATCHING', 'MANUAL');

-- CreateEnum
CREATE TYPE "StatusParticipacao" AS ENUM ('SUGERIDA', 'EM_ANALISE', 'DESCARTADA', 'EM_PREPARACAO', 'ENVIADA', 'EM_DISPUTA', 'HABILITACAO', 'RECURSAL', 'VENCEDORA', 'NAO_VENCEDORA', 'HOMOLOGADA', 'CONTRATADA');

-- CreateTable
CREATE TABLE "licitacoes" (
    "id" TEXT NOT NULL,
    "fonte" "FonteLicitacao" NOT NULL,
    "idExterno" TEXT,
    "orgaoCnpj" TEXT NOT NULL,
    "orgaoNome" TEXT NOT NULL,
    "esfera" TEXT,
    "numeroProcesso" TEXT NOT NULL,
    "modalidadeCodigo" TEXT,
    "modalidadeNome" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "valorEstimado" DECIMAL(16,2),
    "uf" TEXT NOT NULL,
    "municipio" TEXT,
    "dataPublicacao" TIMESTAMP(3),
    "dataLimiteImpugnacao" TIMESTAMP(3),
    "dataLimiteEsclarecimento" TIMESTAMP(3),
    "dataSessaoAbertura" TIMESTAMP(3),
    "linkEdital" TEXT,
    "situacao" TEXT,
    "itensCaptadosEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens" (
    "id" TEXT NOT NULL,
    "licitacaoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidadeMedida" TEXT,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "valorUnitarioEstimado" DECIMAL(16,4),
    "valorTotalEstimado" DECIMAL(16,2),
    "situacao" TEXT,
    "origem" "OrigemItem" NOT NULL DEFAULT 'AUTO_IMPORTADO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacoes" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "licitacaoId" TEXT NOT NULL,
    "status" "StatusParticipacao" NOT NULL DEFAULT 'SUGERIDA',
    "origem" "OrigemParticipacao" NOT NULL,
    "responsavelId" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "autorId" TEXT,
    "anexoUrl" TEXT,
    "licitacaoId" TEXT,
    "participacaoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "licitacoes_uf_idx" ON "licitacoes"("uf");

-- CreateIndex
CREATE INDEX "licitacoes_fonte_idExterno_idx" ON "licitacoes"("fonte", "idExterno");

-- CreateIndex
CREATE UNIQUE INDEX "licitacoes_fonte_numeroProcesso_orgaoCnpj_key" ON "licitacoes"("fonte", "numeroProcesso", "orgaoCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "itens_licitacaoId_numero_key" ON "itens"("licitacaoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "participacoes_clienteId_licitacaoId_key" ON "participacoes"("clienteId", "licitacaoId");

-- CreateIndex
CREATE INDEX "eventos_licitacaoId_idx" ON "eventos"("licitacaoId");

-- CreateIndex
CREATE INDEX "eventos_participacaoId_idx" ON "eventos"("participacaoId");

-- AddForeignKey
ALTER TABLE "itens" ADD CONSTRAINT "itens_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacoes" ADD CONSTRAINT "participacoes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacoes" ADD CONSTRAINT "participacoes_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacoes" ADD CONSTRAINT "participacoes_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_licitacaoId_fkey" FOREIGN KEY ("licitacaoId") REFERENCES "licitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_participacaoId_fkey" FOREIGN KEY ("participacaoId") REFERENCES "participacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
