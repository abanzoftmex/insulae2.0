-- Ticket departments module parity: first-class catalog in Neon + optional relation from tickets.

CREATE TABLE IF NOT EXISTS "TicketDepartment" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "legacyId" INTEGER,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketDepartment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketDepartment_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TicketDepartment_condominiumId_isActive_idx"
  ON "TicketDepartment" ("condominiumId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "TicketDepartment_condominiumId_legacyId_key"
  ON "TicketDepartment" ("condominiumId", "legacyId");

ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

CREATE INDEX IF NOT EXISTS "Ticket_departmentId_idx"
  ON "Ticket" ("departmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Ticket_departmentId_fkey'
  ) THEN
    ALTER TABLE "Ticket"
      ADD CONSTRAINT "Ticket_departmentId_fkey"
      FOREIGN KEY ("departmentId") REFERENCES "TicketDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
