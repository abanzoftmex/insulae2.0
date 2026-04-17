-- Ticket module parity: response workflow fields + active flag + listing indexes.

ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS "response" TEXT,
  ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "responseImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "responseImagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "responsePdfUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "responsePdfPath" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Ticket_condominiumId_isActive_idx"
  ON "Ticket" ("condominiumId", "isActive");

CREATE INDEX IF NOT EXISTS "Ticket_condominiumId_status_idx"
  ON "Ticket" ("condominiumId", "status");
