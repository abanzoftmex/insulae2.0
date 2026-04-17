-- Notification categories: first-class catalog in Insulae 2.0 (no runtime legacy dependency).

CREATE TABLE IF NOT EXISTS "NotificationCategory" (
  "id" TEXT NOT NULL,
  "condominiumId" TEXT NOT NULL,
  "legacyId" INTEGER,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationCategory_condominiumId_isActive_idx"
  ON "NotificationCategory"("condominiumId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'NotificationCategory_condominiumId_legacyId_key'
  ) THEN
    ALTER TABLE "NotificationCategory"
      ADD CONSTRAINT "NotificationCategory_condominiumId_legacyId_key"
      UNIQUE ("condominiumId", "legacyId");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'NotificationCategory_condominiumId_fkey'
  ) THEN
    ALTER TABLE "NotificationCategory"
      ADD CONSTRAINT "NotificationCategory_condominiumId_fkey"
      FOREIGN KEY ("condominiumId")
      REFERENCES "Condominium"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_categoryId_idx"
  ON "Notification"("categoryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_categoryId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_categoryId_fkey"
      FOREIGN KEY ("categoryId")
      REFERENCES "NotificationCategory"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;
