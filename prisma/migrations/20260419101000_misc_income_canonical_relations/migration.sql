-- Canonical relation from MiscIncomeCatalog to ChargeGroup.
ALTER TABLE "MiscIncomeCatalog"
ADD COLUMN "chargeGroupId" TEXT;

CREATE INDEX "MiscIncomeCatalog_chargeGroupId_idx"
ON "MiscIncomeCatalog"("chargeGroupId");

CREATE INDEX "MiscIncomeCatalog_condominiumId_isActive_chargeGroupId_idx"
ON "MiscIncomeCatalog"("condominiumId", "isActive", "chargeGroupId");

ALTER TABLE "MiscIncomeCatalog"
ADD CONSTRAINT "MiscIncomeCatalog_chargeGroupId_fkey"
FOREIGN KEY ("chargeGroupId") REFERENCES "ChargeGroup"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Canonical relation from Income to MiscIncomeCatalog.
ALTER TABLE "Income"
ADD COLUMN "miscCatalogId" TEXT;

CREATE INDEX "Income_miscCatalogId_idx"
ON "Income"("miscCatalogId");

ALTER TABLE "Income"
ADD CONSTRAINT "Income_miscCatalogId_fkey"
FOREIGN KEY ("miscCatalogId") REFERENCES "MiscIncomeCatalog"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
