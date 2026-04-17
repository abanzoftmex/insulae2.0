/*
  Warnings:

  - A unique constraint covering the columns `[paymentId,chargeId]` on the table `PaymentAllocation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "PaymentDetail" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "paymentId" TEXT NOT NULL,
    "chargeGroupId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "creditBalance" DECIMAL(14,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodCatalog" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaymentMethodCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneCatalog" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "initials" TEXT,
    "marketValue" DECIMAL(14,2),
    "weight" DECIMAL(12,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ZoneCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubzoneCatalog" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "zoneLegacyId" INTEGER,
    "name" TEXT NOT NULL,
    "initials" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubzoneCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandUseCatalog" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "initials" TEXT,
    "order" INTEGER,
    "weight" DECIMAL(12,4),
    "percentage" DECIMAL(12,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LandUseCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentDetail_paymentId_idx" ON "PaymentDetail"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentDetail_chargeGroupId_idx" ON "PaymentDetail"("chargeGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentDetail_condominiumId_legacyId_key" ON "PaymentDetail"("condominiumId", "legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodCatalog_condominiumId_legacyId_key" ON "PaymentMethodCatalog"("condominiumId", "legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneCatalog_condominiumId_legacyId_key" ON "ZoneCatalog"("condominiumId", "legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "SubzoneCatalog_condominiumId_legacyId_key" ON "SubzoneCatalog"("condominiumId", "legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "LandUseCatalog_condominiumId_legacyId_key" ON "LandUseCatalog"("condominiumId", "legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_chargeId_key" ON "PaymentAllocation"("paymentId", "chargeId");

-- AddForeignKey
ALTER TABLE "PaymentDetail" ADD CONSTRAINT "PaymentDetail_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDetail" ADD CONSTRAINT "PaymentDetail_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDetail" ADD CONSTRAINT "PaymentDetail_chargeGroupId_fkey" FOREIGN KEY ("chargeGroupId") REFERENCES "ChargeGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethodCatalog" ADD CONSTRAINT "PaymentMethodCatalog_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneCatalog" ADD CONSTRAINT "ZoneCatalog_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubzoneCatalog" ADD CONSTRAINT "SubzoneCatalog_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandUseCatalog" ADD CONSTRAINT "LandUseCatalog_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
