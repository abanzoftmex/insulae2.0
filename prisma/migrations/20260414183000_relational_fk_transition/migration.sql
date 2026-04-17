-- Transicion a relaciones canonicas: Rental -> Commerce y SubzoneCatalog -> ZoneCatalog.
-- Los campos legacy se conservan como metadata para compatibilidad.

CREATE TABLE IF NOT EXISTS "Commerce" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "legacyId" INTEGER,
  "name" TEXT,
  "administrativeContactUserId" TEXT,
  "operativeContactUserId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Commerce_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Rental" ADD COLUMN IF NOT EXISTS "commerceId" TEXT;
ALTER TABLE "SubzoneCatalog" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;

CREATE INDEX IF NOT EXISTS "Commerce_condominiumId_idx"
  ON "Commerce"("condominiumId");

CREATE INDEX IF NOT EXISTS "Commerce_administrativeContactUserId_idx"
  ON "Commerce"("administrativeContactUserId");

CREATE INDEX IF NOT EXISTS "Commerce_operativeContactUserId_idx"
  ON "Commerce"("operativeContactUserId");

CREATE INDEX IF NOT EXISTS "Rental_commerceId_idx"
  ON "Rental"("commerceId");

CREATE INDEX IF NOT EXISTS "SubzoneCatalog_zoneId_idx"
  ON "SubzoneCatalog"("zoneId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Commerce_condominiumId_legacyId_key'
  ) THEN
    ALTER TABLE "Commerce"
      ADD CONSTRAINT "Commerce_condominiumId_legacyId_key"
      UNIQUE ("condominiumId", "legacyId");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Commerce_condominiumId_fkey'
  ) THEN
    ALTER TABLE "Commerce"
      ADD CONSTRAINT "Commerce_condominiumId_fkey"
      FOREIGN KEY ("condominiumId")
      REFERENCES "Condominium"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Commerce_administrativeContactUserId_fkey'
  ) THEN
    ALTER TABLE "Commerce"
      ADD CONSTRAINT "Commerce_administrativeContactUserId_fkey"
      FOREIGN KEY ("administrativeContactUserId")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Commerce_operativeContactUserId_fkey'
  ) THEN
    ALTER TABLE "Commerce"
      ADD CONSTRAINT "Commerce_operativeContactUserId_fkey"
      FOREIGN KEY ("operativeContactUserId")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Rental_commerceId_fkey'
  ) THEN
    ALTER TABLE "Rental"
      ADD CONSTRAINT "Rental_commerceId_fkey"
      FOREIGN KEY ("commerceId")
      REFERENCES "Commerce"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SubzoneCatalog_zoneId_fkey'
  ) THEN
    ALTER TABLE "SubzoneCatalog"
      ADD CONSTRAINT "SubzoneCatalog_zoneId_fkey"
      FOREIGN KEY ("zoneId")
      REFERENCES "ZoneCatalog"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- Backfill SubzoneCatalog.zoneId usando legacy ids mientras exista metadata.
UPDATE "SubzoneCatalog" AS subzone
SET "zoneId" = zone."id"
FROM "ZoneCatalog" AS zone
WHERE subzone."zoneId" IS NULL
  AND subzone."zoneLegacyId" IS NOT NULL
  AND zone."condominiumId" = subzone."condominiumId"
  AND zone."legacyId" = subzone."zoneLegacyId";

-- Sembrar Commerce desde Rental cuando hay commerceLegacyId historico.
INSERT INTO "Commerce" (
  "id",
  "condominiumId",
  "legacyId",
  "name",
  "administrativeContactUserId",
  "operativeContactUserId",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT ON (r."condominiumId", r."commerceLegacyId")
  ('legacy-commerce-' || r."condominiumId" || '-' || r."commerceLegacyId")::text,
  r."condominiumId",
  r."commerceLegacyId",
  NULLIF(r."tenantName", ''),
  r."administrativeContactUserId",
  r."operativeContactUserId",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Rental" AS r
WHERE r."commerceLegacyId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Commerce" AS c
    WHERE c."condominiumId" = r."condominiumId"
      AND c."legacyId" = r."commerceLegacyId"
  )
ORDER BY r."condominiumId", r."commerceLegacyId", r."startsAt" DESC NULLS LAST, r."id" DESC;

-- Backfill Rental.commerceId con la nueva FK canonica.
UPDATE "Rental" AS rental
SET "commerceId" = commerce."id"
FROM "Commerce" AS commerce
WHERE rental."commerceId" IS NULL
  AND rental."commerceLegacyId" IS NOT NULL
  AND commerce."condominiumId" = rental."condominiumId"
  AND commerce."legacyId" = rental."commerceLegacyId";
