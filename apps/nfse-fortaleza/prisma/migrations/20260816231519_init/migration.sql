-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "apelido" TEXT,
    "sefinUsuarioCriptografado" TEXT NOT NULL,
    "sefinSenhaCriptografada" TEXT NOT NULL,
    "permiteModoAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "idNoPortal" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpjOuCpf" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotaFiscal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "discriminacaoServico" TEXT NOT NULL,
    "valorServico" REAL NOT NULL,
    "aliquotaIss" REAL,
    "itemListaServico" TEXT,
    "dataCompetencia" DATETIME,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "modo" TEXT NOT NULL DEFAULT 'SEMI_AUTOMATICO',
    "numeroNotaEmitida" TEXT,
    "urlPdfNota" TEXT,
    "erroMensagem" TEXT,
    "screenshotRevisaoPath" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "emitidoEm" DATETIME,
    CONSTRAINT "NotaFiscal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NotaFiscal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_empresaId_idNoPortal_key" ON "Cliente"("empresaId", "idNoPortal");
