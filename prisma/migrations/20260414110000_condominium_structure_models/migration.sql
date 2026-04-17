-- Estructura condominal: grupos y puestos (conceptos) administrables desde Insulae 2.0.

CREATE TABLE IF NOT EXISTS "CondominiumStructureGroup" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "legacyId" INTEGER,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "structureType" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CondominiumStructureGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CondominiumStructurePosition" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "legacyId" INTEGER,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "isAlternate" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CondominiumStructurePosition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CondominiumStructureGroup_condominiumId_isActive_position_idx"
  ON "CondominiumStructureGroup"("condominiumId", "isActive", "position");

CREATE INDEX IF NOT EXISTS "CondominiumStructurePosition_condominiumId_isActive_idx"
  ON "CondominiumStructurePosition"("condominiumId", "isActive");

CREATE INDEX IF NOT EXISTS "CondominiumStructurePosition_groupId_isActive_sortOrder_idx"
  ON "CondominiumStructurePosition"("groupId", "isActive", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CondominiumStructureGroup_condominiumId_legacyId_key'
  ) THEN
    ALTER TABLE "CondominiumStructureGroup"
      ADD CONSTRAINT "CondominiumStructureGroup_condominiumId_legacyId_key"
      UNIQUE ("condominiumId", "legacyId");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CondominiumStructurePosition_condominiumId_legacyId_key'
  ) THEN
    ALTER TABLE "CondominiumStructurePosition"
      ADD CONSTRAINT "CondominiumStructurePosition_condominiumId_legacyId_key"
      UNIQUE ("condominiumId", "legacyId");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CondominiumStructureGroup_condominiumId_fkey'
  ) THEN
    ALTER TABLE "CondominiumStructureGroup"
      ADD CONSTRAINT "CondominiumStructureGroup_condominiumId_fkey"
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
    WHERE conname = 'CondominiumStructurePosition_condominiumId_fkey'
  ) THEN
    ALTER TABLE "CondominiumStructurePosition"
      ADD CONSTRAINT "CondominiumStructurePosition_condominiumId_fkey"
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
    WHERE conname = 'CondominiumStructurePosition_groupId_fkey'
  ) THEN
    ALTER TABLE "CondominiumStructurePosition"
      ADD CONSTRAINT "CondominiumStructurePosition_groupId_fkey"
      FOREIGN KEY ("groupId")
      REFERENCES "CondominiumStructureGroup"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;
