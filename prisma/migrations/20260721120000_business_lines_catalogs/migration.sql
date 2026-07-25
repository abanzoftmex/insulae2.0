-- AlterTable
ALTER TABLE "Rental"
ADD COLUMN "legacyId" INTEGER,
ADD COLUMN "businessClass" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Rental_condominiumId_legacyId_key" ON "Rental"("condominiumId", "legacyId");

-- CreateTable
CREATE TABLE "BusinessLineCatalog" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "legacyId" INTEGER,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessLineCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCategoryCatalog" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "legacyId" INTEGER,
  "businessLineId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessCategoryCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSubcategoryCatalog" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "legacyId" INTEGER,
  "categoryId" TEXT NOT NULL,
  "businessLineId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessSubcategoryCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalBusinessLine" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "rentalId" TEXT NOT NULL,
  "slot" INTEGER NOT NULL DEFAULT 0,
  "businessLineId" TEXT NOT NULL,
  "categoryId" TEXT,
  "subcategoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RentalBusinessLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLineCatalog_condominiumId_legacyId_key" ON "BusinessLineCatalog"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "BusinessLineCatalog_condominiumId_isActive_idx" ON "BusinessLineCatalog"("condominiumId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCategoryCatalog_condominiumId_legacyId_key" ON "BusinessCategoryCatalog"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "BusinessCategoryCatalog_businessLineId_idx" ON "BusinessCategoryCatalog"("businessLineId");

-- CreateIndex
CREATE INDEX "BusinessCategoryCatalog_condominiumId_isActive_idx" ON "BusinessCategoryCatalog"("condominiumId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSubcategoryCatalog_condominiumId_legacyId_key" ON "BusinessSubcategoryCatalog"("condominiumId", "legacyId");

-- CreateIndex
CREATE INDEX "BusinessSubcategoryCatalog_categoryId_idx" ON "BusinessSubcategoryCatalog"("categoryId");

-- CreateIndex
CREATE INDEX "BusinessSubcategoryCatalog_condominiumId_isActive_idx" ON "BusinessSubcategoryCatalog"("condominiumId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RentalBusinessLine_rentalId_slot_key" ON "RentalBusinessLine"("rentalId", "slot");

-- CreateIndex
CREATE INDEX "RentalBusinessLine_condominiumId_idx" ON "RentalBusinessLine"("condominiumId");

-- CreateIndex
CREATE INDEX "RentalBusinessLine_businessLineId_idx" ON "RentalBusinessLine"("businessLineId");

-- CreateIndex
CREATE INDEX "RentalBusinessLine_categoryId_idx" ON "RentalBusinessLine"("categoryId");

-- AddForeignKey
ALTER TABLE "BusinessLineCatalog" ADD CONSTRAINT "BusinessLineCatalog_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCategoryCatalog" ADD CONSTRAINT "BusinessCategoryCatalog_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCategoryCatalog" ADD CONSTRAINT "BusinessCategoryCatalog_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLineCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSubcategoryCatalog" ADD CONSTRAINT "BusinessSubcategoryCatalog_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSubcategoryCatalog" ADD CONSTRAINT "BusinessSubcategoryCatalog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BusinessCategoryCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSubcategoryCatalog" ADD CONSTRAINT "BusinessSubcategoryCatalog_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLineCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBusinessLine" ADD CONSTRAINT "RentalBusinessLine_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBusinessLine" ADD CONSTRAINT "RentalBusinessLine_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBusinessLine" ADD CONSTRAINT "RentalBusinessLine_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "BusinessLineCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBusinessLine" ADD CONSTRAINT "RentalBusinessLine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BusinessCategoryCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBusinessLine" ADD CONSTRAINT "RentalBusinessLine_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "BusinessSubcategoryCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
