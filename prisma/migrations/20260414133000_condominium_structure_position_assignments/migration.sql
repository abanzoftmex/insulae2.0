-- Estructura condominal: asignaciones de responsables y suplentes por puesto.

CREATE TABLE IF NOT EXISTS "CondominiumStructurePositionAssignment" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isAlternate" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CondominiumStructurePositionAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CondominiumStructurePositionAssignment_condominiumId_isActive_idx"
  ON "CondominiumStructurePositionAssignment"("condominiumId", "isActive");

CREATE INDEX IF NOT EXISTS "CondominiumStructurePositionAssignment_positionId_isAlternate_isActive_idx"
  ON "CondominiumStructurePositionAssignment"("positionId", "isAlternate", "isActive");

CREATE INDEX IF NOT EXISTS "CondominiumStructurePositionAssignment_userId_isActive_idx"
  ON "CondominiumStructurePositionAssignment"("userId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CondominiumStructurePositionAssignment_positionId_userId_isAlternate_key'
  ) THEN
    ALTER TABLE "CondominiumStructurePositionAssignment"
      ADD CONSTRAINT "CondominiumStructurePositionAssignment_positionId_userId_isAlternate_key"
      UNIQUE ("positionId", "userId", "isAlternate");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CondominiumStructurePositionAssignment_condominiumId_fkey'
  ) THEN
    ALTER TABLE "CondominiumStructurePositionAssignment"
      ADD CONSTRAINT "CondominiumStructurePositionAssignment_condominiumId_fkey"
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
    WHERE conname = 'CondominiumStructurePositionAssignment_positionId_fkey'
  ) THEN
    ALTER TABLE "CondominiumStructurePositionAssignment"
      ADD CONSTRAINT "CondominiumStructurePositionAssignment_positionId_fkey"
      FOREIGN KEY ("positionId")
      REFERENCES "CondominiumStructurePosition"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CondominiumStructurePositionAssignment_userId_fkey'
  ) THEN
    ALTER TABLE "CondominiumStructurePositionAssignment"
      ADD CONSTRAINT "CondominiumStructurePositionAssignment_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;
