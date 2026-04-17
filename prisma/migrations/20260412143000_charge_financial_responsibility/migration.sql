-- Semantic financial split for Charge: OWNER vs COMMERCE responsibilities.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChargeResponsibility') THEN
    CREATE TYPE "ChargeResponsibility" AS ENUM ('OWNER', 'COMMERCE');
  END IF;
END
$$;

ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "tenancyId" TEXT;
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "responsibility" "ChargeResponsibility";
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "interestAmount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "Charge" ADD COLUMN IF NOT EXISTS "isCollectible" BOOLEAN DEFAULT true;

UPDATE "Charge" SET "responsibility" = 'OWNER' WHERE "responsibility" IS NULL;
UPDATE "Charge" SET "paidAmount" = 0 WHERE "paidAmount" IS NULL;
UPDATE "Charge" SET "interestAmount" = 0 WHERE "interestAmount" IS NULL;
UPDATE "Charge" SET "discountAmount" = 0 WHERE "discountAmount" IS NULL;
UPDATE "Charge" SET "isCollectible" = true WHERE "isCollectible" IS NULL;

ALTER TABLE "Charge" ALTER COLUMN "responsibility" SET DEFAULT 'OWNER';
ALTER TABLE "Charge" ALTER COLUMN "responsibility" SET NOT NULL;
ALTER TABLE "Charge" ALTER COLUMN "paidAmount" SET DEFAULT 0;
ALTER TABLE "Charge" ALTER COLUMN "paidAmount" SET NOT NULL;
ALTER TABLE "Charge" ALTER COLUMN "interestAmount" SET DEFAULT 0;
ALTER TABLE "Charge" ALTER COLUMN "interestAmount" SET NOT NULL;
ALTER TABLE "Charge" ALTER COLUMN "discountAmount" SET DEFAULT 0;
ALTER TABLE "Charge" ALTER COLUMN "discountAmount" SET NOT NULL;
ALTER TABLE "Charge" ALTER COLUMN "isCollectible" SET DEFAULT true;
ALTER TABLE "Charge" ALTER COLUMN "isCollectible" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Charge_tenancyId_fkey'
  ) THEN
    ALTER TABLE "Charge"
      ADD CONSTRAINT "Charge_tenancyId_fkey"
      FOREIGN KEY ("tenancyId")
      REFERENCES "Rental"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "Charge_tenancyId_idx" ON "Charge" ("tenancyId");
CREATE INDEX IF NOT EXISTS "Charge_privateAreaId_responsibility_periodYear_periodMonth_idx"
  ON "Charge" ("privateAreaId", "responsibility", "periodYear", "periodMonth");
