-- CreateEnum
CREATE TYPE "LucaSyncStatus" AS ENUM (
  'RECEIVED',
  'VALIDATED',
  'EXECUTED',
  'REJECTED'
);

-- AlterTable
ALTER TABLE "Condominium"
ADD COLUMN "lucaTenantId" TEXT;

-- AlterTable
ALTER TABLE "PrivateArea"
ADD COLUMN "lucaPropertyId" TEXT,
ADD COLUMN "lucaPropertyCode" TEXT;

-- AlterTable
ALTER TABLE "budget_expense_concept"
ADD COLUMN "luca_account_id" TEXT,
ADD COLUMN "luca_account_code" TEXT;

-- AlterTable
ALTER TABLE "Income"
ADD COLUMN "accountingNote" TEXT,
ADD COLUMN "externalSource" TEXT,
ADD COLUMN "externalId" TEXT,
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedBy" TEXT;

-- AlterTable
ALTER TABLE "Expense"
ADD COLUMN "accountingNote" TEXT,
ADD COLUMN "externalSource" TEXT,
ADD COLUMN "externalId" TEXT,
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedBy" TEXT;

-- CreateTable
CREATE TABLE "LucaSyncEvent" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "LucaSyncStatus" NOT NULL DEFAULT 'RECEIVED',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "errorMessage" TEXT,

  CONSTRAINT "LucaSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Condominium_lucaTenantId_key"
ON "Condominium"("lucaTenantId");

-- CreateIndex
CREATE INDEX "PrivateArea_condominiumId_lucaPropertyCode_idx"
ON "PrivateArea"("condominiumId", "lucaPropertyCode");

-- CreateIndex
CREATE UNIQUE INDEX "budget_expense_concept_condominium_id_year_luca_account_co_key"
ON "budget_expense_concept"("condominium_id", "year", "luca_account_code");

-- CreateIndex
CREATE UNIQUE INDEX "Income_condominiumId_externalSource_externalId_key"
ON "Income"("condominiumId", "externalSource", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_condominiumId_externalSource_externalId_key"
ON "Expense"("condominiumId", "externalSource", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "LucaSyncEvent_condominiumId_externalId_key"
ON "LucaSyncEvent"("condominiumId", "externalId");

-- CreateIndex
CREATE INDEX "LucaSyncEvent_condominiumId_status_idx"
ON "LucaSyncEvent"("condominiumId", "status");

-- AddForeignKey
ALTER TABLE "LucaSyncEvent"
ADD CONSTRAINT "LucaSyncEvent_condominiumId_fkey"
FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
