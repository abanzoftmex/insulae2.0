-- AlterTable
ALTER TABLE "Rental"
ADD COLUMN "commerceLegacyId" INTEGER,
ADD COLUMN "administrativeContactUserId" TEXT,
ADD COLUMN "operativeContactUserId" TEXT;

-- CreateIndex
CREATE INDEX "Rental_commerceLegacyId_idx"
ON "Rental"("commerceLegacyId");

-- CreateIndex
CREATE INDEX "Rental_administrativeContactUserId_idx"
ON "Rental"("administrativeContactUserId");

-- CreateIndex
CREATE INDEX "Rental_operativeContactUserId_idx"
ON "Rental"("operativeContactUserId");

-- AddForeignKey
ALTER TABLE "Rental"
ADD CONSTRAINT "Rental_administrativeContactUserId_fkey"
FOREIGN KEY ("administrativeContactUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental"
ADD CONSTRAINT "Rental_operativeContactUserId_fkey"
FOREIGN KEY ("operativeContactUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
