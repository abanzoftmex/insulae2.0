-- CreateEnum
CREATE TYPE "ExpenseBudgetGroup" AS ENUM (
  'ADMINISTRATION',
  'MAINTENANCE',
  'SECURITY',
  'INFRASTRUCTURE',
  'EXTRAORDINARY',
  'OTHER'
);

-- CreateTable
CREATE TABLE "budget_expense_concept" (
  "id" TEXT NOT NULL,
  "condominium_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "group" "ExpenseBudgetGroup" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "legacy_budget_concept_id" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'legacy_etl',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "budget_expense_concept_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Expense"
ADD COLUMN "budgetConceptId" TEXT;

-- AlterTable
ALTER TABLE "BudgetLine"
ADD COLUMN "budgetConceptId" TEXT;

-- AlterTable
ALTER TABLE "expense_concept_group_map"
ADD COLUMN "budget_concept_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "budget_expense_concept_condominium_id_year_legacy_budget_conc_key"
ON "budget_expense_concept"("condominium_id", "year", "legacy_budget_concept_id");

-- CreateIndex
CREATE INDEX "budget_expense_concept_condominium_id_year_group_is_active_idx"
ON "budget_expense_concept"("condominium_id", "year", "group", "is_active");

-- CreateIndex
CREATE INDEX "budget_expense_concept_condominium_id_year_is_active_idx"
ON "budget_expense_concept"("condominium_id", "year", "is_active");

-- CreateIndex
CREATE INDEX "budget_expense_concept_condominium_id_year_name_idx"
ON "budget_expense_concept"("condominium_id", "year", "name");

-- CreateIndex
CREATE INDEX "Expense_budgetConceptId_idx"
ON "Expense"("budgetConceptId");

-- CreateIndex
CREATE INDEX "BudgetLine_budgetConceptId_idx"
ON "BudgetLine"("budgetConceptId");

-- CreateIndex
CREATE INDEX "expense_concept_group_map_budget_concept_id_idx"
ON "expense_concept_group_map"("budget_concept_id");

-- AddForeignKey
ALTER TABLE "budget_expense_concept"
ADD CONSTRAINT "budget_expense_concept_condominium_id_fkey"
FOREIGN KEY ("condominium_id") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_expense_concept"
ADD CONSTRAINT "budget_expense_concept_condominium_id_year_fkey"
FOREIGN KEY ("condominium_id", "year") REFERENCES "Budget"("condominiumId", "year") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_budgetConceptId_fkey"
FOREIGN KEY ("budgetConceptId") REFERENCES "budget_expense_concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine"
ADD CONSTRAINT "BudgetLine_budgetConceptId_fkey"
FOREIGN KEY ("budgetConceptId") REFERENCES "budget_expense_concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_concept_group_map"
ADD CONSTRAINT "expense_concept_group_map_budget_concept_id_fkey"
FOREIGN KEY ("budget_concept_id") REFERENCES "budget_expense_concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
