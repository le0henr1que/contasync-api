-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'AWAITING_INVOICE';
ALTER TYPE "PaymentStatus" ADD VALUE 'READY_TO_PAY';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "invoiceAttachedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceAttachedBy" TEXT,
ADD COLUMN     "requiresInvoice" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "payment_documents" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachedBy" TEXT NOT NULL,

    CONSTRAINT "payment_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_documents_paymentId_idx" ON "payment_documents"("paymentId");

-- CreateIndex
CREATE INDEX "payment_documents_documentId_idx" ON "payment_documents"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_documents_paymentId_documentId_key" ON "payment_documents"("paymentId", "documentId");

-- AddForeignKey
ALTER TABLE "payment_documents" ADD CONSTRAINT "payment_documents_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_documents" ADD CONSTRAINT "payment_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
