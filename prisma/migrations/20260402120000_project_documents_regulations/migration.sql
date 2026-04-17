-- CreateEnum
CREATE TYPE "ProjectDocumentType" AS ENUM ('REGULATION', 'INTERNAL_DOCUMENT');

-- AlterTable
ALTER TABLE "ProjectDocument"
ADD COLUMN "documentType" "ProjectDocumentType" NOT NULL DEFAULT 'REGULATION',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_documentType_idx" ON "ProjectDocument"("projectId", "documentType");

-- CreateIndex
CREATE INDEX "ProjectDocument_isActive_idx" ON "ProjectDocument"("isActive");
