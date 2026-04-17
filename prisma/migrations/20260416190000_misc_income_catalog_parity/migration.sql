-- Add DCAT_VARIOS parity catalog for financial summary "otros ingresos" rows.
CREATE TABLE IF NOT EXISTS "MiscIncomeCatalog" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "legacyChargeGroupId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MiscIncomeCatalog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MiscIncomeCatalog_condominiumId_isActive_legacyChargeGroupId_idx"
    ON "MiscIncomeCatalog"("condominiumId", "isActive", "legacyChargeGroupId");

CREATE UNIQUE INDEX IF NOT EXISTS "MiscIncomeCatalog_condominiumId_legacyId_key"
    ON "MiscIncomeCatalog"("condominiumId", "legacyId");

CREATE INDEX IF NOT EXISTS "Income_condominiumId_legacyMiscCatalogId_legacyChargeGroupId_isActive_date_idx"
    ON "Income"("condominiumId", "legacyMiscCatalogId", "legacyChargeGroupId", "isActive", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MiscIncomeCatalog_condominiumId_fkey'
  ) THEN
    ALTER TABLE "MiscIncomeCatalog"
      ADD CONSTRAINT "MiscIncomeCatalog_condominiumId_fkey"
      FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
