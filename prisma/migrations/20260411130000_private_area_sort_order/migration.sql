-- AlterTable
ALTER TABLE "PrivateArea"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "PrivateArea_condominiumId_parentPrivateAreaId_sortOrder_idx"
ON "PrivateArea"("condominiumId", "parentPrivateAreaId", "sortOrder");
