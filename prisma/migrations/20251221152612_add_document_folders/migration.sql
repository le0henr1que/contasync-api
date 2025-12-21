-- CreateEnum
CREATE TYPE "FolderType" AS ENUM ('NOTAS_FISCAIS', 'CONTRATOS', 'DECLARACOES', 'COMPROVANTES', 'BALANCETES', 'OUTROS');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "document_folders" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FolderType" NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_folders_clientId_idx" ON "document_folders"("clientId");

-- CreateIndex
CREATE INDEX "document_folders_type_idx" ON "document_folders"("type");

-- CreateIndex
CREATE INDEX "documents_folderId_idx" ON "documents"("folderId");

-- AddForeignKey
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "document_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
