-- Límite de intentos del login, de las solicitudes de restablecimiento de contraseña y del
-- modo superadmin (src/shared/infrastructure/db/auth-throttle.ts). Solo crea una tabla nueva;
-- el código funciona sin ella (no limita) hasta que se aplique.

-- CreateTable
CREATE TABLE "AuthThrottle" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthThrottle_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AuthThrottle_updatedAt_idx" ON "AuthThrottle"("updatedAt");
