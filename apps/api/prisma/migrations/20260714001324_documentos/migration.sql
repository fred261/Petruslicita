-- CreateTable
CREATE TABLE "modelos_documento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "validadeEmDiasPadrao" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "caminhoArmazenamento" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3),
    "dataValidade" TIMESTAMP(3),
    "clienteId" TEXT,
    "participacaoId" TEXT,
    "uploadedById" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modelos_documento_nome_key" ON "modelos_documento"("nome");

-- CreateIndex
CREATE INDEX "documentos_clienteId_idx" ON "documentos"("clienteId");

-- CreateIndex
CREATE INDEX "documentos_participacaoId_idx" ON "documentos"("participacaoId");

-- CreateIndex
CREATE INDEX "documentos_dataValidade_idx" ON "documentos"("dataValidade");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_participacaoId_fkey" FOREIGN KEY ("participacaoId") REFERENCES "participacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
