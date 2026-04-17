-- Financial summary phase 1: preserve legacy financial classification metadata in canonical entities.

ALTER TABLE "Income"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "legacyChargeGroupId" INTEGER,
  ADD COLUMN IF NOT EXISTS "legacyMiscCatalogId" INTEGER,
  ADD COLUMN IF NOT EXISTS "legacyPrivateAreaId" INTEGER,
  ADD COLUMN IF NOT EXISTS "isConfirmed" BOOLEAN;

ALTER TABLE "Expense"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "legacyBudgetConceptId" INTEGER,
  ADD COLUMN IF NOT EXISTS "legacyReceipt" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyProjectName" TEXT;

CREATE INDEX IF NOT EXISTS "Income_condominiumId_isActive_date_idx"
  ON "Income" ("condominiumId", "isActive", "date");

CREATE INDEX IF NOT EXISTS "Income_condominiumId_legacyChargeGroupId_idx"
  ON "Income" ("condominiumId", "legacyChargeGroupId");

CREATE INDEX IF NOT EXISTS "Expense_condominiumId_isActive_date_idx"
  ON "Expense" ("condominiumId", "isActive", "date");

CREATE INDEX IF NOT EXISTS "Expense_condominiumId_legacyBudgetConceptId_idx"
  ON "Expense" ("condominiumId", "legacyBudgetConceptId");
