import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyExpenseRow = {
  id_gastos?: unknown;
  activo?: unknown;
  id_cat_conceptos_presupuesto?: unknown;
  recibo?: unknown;
  proyecto?: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asInt(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true") {
      return true;
    }

    if (normalized === "0" || normalized === "false") {
      return false;
    }
  }

  return fallback;
}

async function readLegacyRows(filePath: string): Promise<LegacyExpenseRow[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyExpenseRow);
}

function isMissingRecordError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === "P2025";
}

async function main(): Promise<void> {
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.split("=")[1];
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const filePath = fileArg ?? path.resolve(scriptDir, "../../data/legacy-export/GASTOS.ndjson");

  const legacyRows = await readLegacyRows(filePath);
  if (legacyRows.length === 0) {
    throw new Error(`No se encontraron registros en ${filePath}`);
  }

  const condominium =
    (await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true, slug: true, name: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
    }));

  if (!condominium) {
    throw new Error("No se encontro condominio activo para aplicar backfill de contexto legacy de gastos");
  }

  let scanned = 0;
  let updated = 0;
  let missing = 0;
  let skipped = 0;

  for (const row of legacyRows) {
    scanned += 1;

    const legacyId = asInt(row.id_gastos);
    if (legacyId === null) {
      skipped += 1;
      continue;
    }

    try {
      await prisma.expense.update({
        where: {
          condominiumId_legacyId: {
            condominiumId: condominium.id,
            legacyId,
          },
        },
        data: {
          isActive: asBoolean(row.activo, true),
          legacyBudgetConceptId: asInt(row.id_cat_conceptos_presupuesto),
          legacyReceipt: asString(row.recibo),
          legacyProjectName: asString(row.proyecto),
        },
      });

      updated += 1;
    } catch (error) {
      if (isMissingRecordError(error)) {
        missing += 1;
        continue;
      }

      throw error;
    }
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        condominiumName: condominium.name,
        sourceFile: filePath,
        scanned,
        updated,
        missing,
        skipped,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
