-- AlterTable
ALTER TABLE "budget_group" ADD COLUMN "luca_account_id" TEXT,
ADD COLUMN "luca_account_code" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "budgetGroupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "budget_group_condominium_id_year_luca_account_code_key" ON "budget_group"("condominium_id", "year", "luca_account_code");

-- CreateIndex
CREATE INDEX "Expense_budgetGroupId_idx" ON "Expense"("budgetGroupId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budgetGroupId_fkey" FOREIGN KEY ("budgetGroupId") REFERENCES "budget_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
