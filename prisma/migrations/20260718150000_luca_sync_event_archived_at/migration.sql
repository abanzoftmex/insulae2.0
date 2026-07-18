-- AlterTable
ALTER TABLE "LucaSyncEvent" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "LucaSyncEvent_condominiumId_status_archivedAt_idx" ON "LucaSyncEvent"("condominiumId", "status", "archivedAt");
