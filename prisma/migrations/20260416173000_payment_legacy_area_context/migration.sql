-- Legacy area context for deterministic parity with legacy report filters.
ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "legacyAreaCode" INTEGER,
ADD COLUMN IF NOT EXISTS "legacyAreaIsActive" BOOLEAN;

CREATE INDEX IF NOT EXISTS "Payment_condominiumId_legacyAreaIsActive_idx"
ON "Payment"("condominiumId", "legacyAreaIsActive");
