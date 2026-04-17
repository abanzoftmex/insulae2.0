-- Notification module parity: vigencia + adjuntos (imagen/PDF) persisted in first-class columns.

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "imagePath" TEXT;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "pdfPath" TEXT;
