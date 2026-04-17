import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

function normalizeNeonSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const isNeonHost = url.hostname.includes("neon.tech");
    if (!isNeonHost) {
      return connectionString;
    }

    const currentMode = url.searchParams.get("sslmode");
    if (!currentMode || currentMode === "prefer" || currentMode === "require" || currentMode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }

    return connectionString;
  } catch {
    return connectionString;
  }
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL es requerido para inicializar PrismaClient");
}

const adapter = new PrismaPg({ connectionString: normalizeNeonSslMode(databaseUrl) });

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
