/*
  Warnings:

  - You are about to drop the column `status` on the `documents` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'AWAITING_VALIDATION';

-- DropIndex
DROP INDEX "documents_status_idx";

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "accountantId" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- DropEnum
DROP TYPE "DocumentStatus";

-- CreateIndex
CREATE INDEX "notifications_accountantId_idx" ON "notifications"("accountantId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_accountantId_fkey" FOREIGN KEY ("accountantId") REFERENCES "accountants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
