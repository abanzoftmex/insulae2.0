-- CreateEnum
CREATE TYPE "ChargeGroupCanonicalKind" AS ENUM (
  'ORDINARY',
  'EXTRA_CONDO',
  'EXTRA_COMMERCE',
  'STC',
  'SANCTION',
  'COMODATO',
  'OTHER'
);

-- AlterTable
ALTER TABLE "ChargeGroup"
ADD COLUMN "kind" "ChargeGroupCanonicalKind" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "ChargeGroup_condominiumId_kind_isActive_idx"
ON "ChargeGroup"("condominiumId", "kind", "isActive");
