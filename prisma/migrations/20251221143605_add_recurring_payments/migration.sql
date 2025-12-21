-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentPaymentId" TEXT,
ADD COLUMN     "recurringDayOfMonth" INTEGER,
ADD COLUMN     "recurringEndDate" TIMESTAMP(3),
ADD COLUMN     "recurringFrequency" "RecurringFrequency";

-- CreateIndex
CREATE INDEX "payments_isRecurring_idx" ON "payments"("isRecurring");

-- CreateIndex
CREATE INDEX "payments_parentPaymentId_idx" ON "payments"("parentPaymentId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_parentPaymentId_fkey" FOREIGN KEY ("parentPaymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
