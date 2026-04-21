-- Canonical visibility flag for financial summary runtime.
ALTER TABLE "Payment"
ADD COLUMN "isVisibleInFinancialSummary" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Payment_condominiumId_isVisibleInFinancialSummary_idx"
ON "Payment"("condominiumId", "isVisibleInFinancialSummary");

-- Canonical relation from Income to ChargeGroup.
ALTER TABLE "Income"
ADD COLUMN "chargeGroupId" TEXT;

CREATE INDEX "Income_chargeGroupId_idx"
ON "Income"("chargeGroupId");

ALTER TABLE "Income"
ADD CONSTRAINT "Income_chargeGroupId_fkey"
FOREIGN KEY ("chargeGroupId") REFERENCES "ChargeGroup"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
