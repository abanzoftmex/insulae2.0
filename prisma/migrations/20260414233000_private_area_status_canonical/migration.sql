-- CreateEnum
CREATE TYPE "PrivateAreaStatus" AS ENUM (
  'UNASSIGNED',
  'AVAILABLE',
  'SOLD',
  'UNDER_CONSTRUCTION',
  'RENTED',
  'DELINQUENT'
);

-- AlterTable
ALTER TABLE "PrivateArea"
ADD COLUMN "status" "PrivateAreaStatus" NOT NULL DEFAULT 'UNASSIGNED';

-- Backfill canonical status from legacy values
UPDATE "PrivateArea"
SET "status" = CASE "legacyStatusId"
  WHEN 1 THEN 'AVAILABLE'::"PrivateAreaStatus"
  WHEN 2 THEN 'SOLD'::"PrivateAreaStatus"
  WHEN 3 THEN 'UNDER_CONSTRUCTION'::"PrivateAreaStatus"
  WHEN 4 THEN 'RENTED'::"PrivateAreaStatus"
  WHEN 5 THEN 'DELINQUENT'::"PrivateAreaStatus"
  ELSE 'UNASSIGNED'::"PrivateAreaStatus"
END;

-- DropIndex
DROP INDEX IF EXISTS "PrivateArea_legacyStatusId_idx";

-- CreateIndex
CREATE INDEX "PrivateArea_status_idx" ON "PrivateArea"("status");

-- AlterTable
ALTER TABLE "PrivateArea" DROP COLUMN "legacyStatusId";
