-- Drop transitional legacy relation columns after canonical FK backfill is complete.
DROP INDEX IF EXISTS "Rental_commerceLegacyId_idx";

ALTER TABLE "Rental"
  DROP COLUMN IF EXISTS "commerceLegacyId";

ALTER TABLE "SubzoneCatalog"
  DROP COLUMN IF EXISTS "zoneLegacyId";
