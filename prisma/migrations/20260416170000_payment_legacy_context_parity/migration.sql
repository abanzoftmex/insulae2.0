-- Payment legacy context fields required for financial parity with legacy report filters.
ALTER TABLE "Payment"
ADD COLUMN "privateAreaId" TEXT,
ADD COLUMN "legacyStatusCode" INTEGER,
ADD COLUMN "isLegacyActive" BOOLEAN;

CREATE INDEX "Payment_privateAreaId_idx" ON "Payment"("privateAreaId");
CREATE INDEX "Payment_condominiumId_legacyStatusCode_idx" ON "Payment"("condominiumId", "legacyStatusCode");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_privateAreaId_fkey"
FOREIGN KEY ("privateAreaId") REFERENCES "PrivateArea"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
