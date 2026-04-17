-- AlterTable
ALTER TABLE "PrivateArea"
ADD COLUMN "parentPrivateAreaId" TEXT,
ADD COLUMN "legacyStatusId" INTEGER,
ADD COLUMN "isFusion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "m2Construction" DECIMAL(12,4),
ADD COLUMN "m2CommonArea" DECIMAL(12,4),
ADD COLUMN "m2ConstructionChildren" DECIMAL(12,4),
ADD COLUMN "m2CommonAreaChildren" DECIMAL(12,4),
ADD COLUMN "vccc" DECIMAL(14,6);

-- CreateIndex
CREATE INDEX "PrivateArea_parentPrivateAreaId_idx" ON "PrivateArea"("parentPrivateAreaId");

-- CreateIndex
CREATE INDEX "PrivateArea_legacyStatusId_idx" ON "PrivateArea"("legacyStatusId");

-- CreateIndex
CREATE INDEX "PrivateArea_isFusion_idx" ON "PrivateArea"("isFusion");

-- AddForeignKey
ALTER TABLE "PrivateArea"
ADD CONSTRAINT "PrivateArea_parentPrivateAreaId_fkey"
FOREIGN KEY ("parentPrivateAreaId") REFERENCES "PrivateArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
