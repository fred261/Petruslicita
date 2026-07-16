-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "documentoId" TEXT;

-- CreateIndex
CREATE INDEX "notificacoes_documentoId_tipo_idx" ON "notificacoes"("documentoId", "tipo");
