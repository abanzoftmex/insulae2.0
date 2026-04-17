import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type ExpenseConceptGroupMapUpsertDelegate = {
  upsert(args: unknown): Promise<unknown>;
};

const expenseConceptGroupMapModel = (
  prisma as unknown as {
    expenseConceptGroupMap: ExpenseConceptGroupMapUpsertDelegate;
  }
).expenseConceptGroupMap;

type LegacyBudgetDetailRow = {
  anio?: unknown;
  activo?: unknown;
  id_cat_conceptos_presupuesto?: unknown;
  id_cat_grupos_presupuesto?: unknown;
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

async function readLegacyBudgetDetailRows(filePath: string): Promise<LegacyBudgetDetailRow[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyBudgetDetailRow);
}

async function main(): Promise<void> {
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.split("=")[1];
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const filePath = fileArg ?? path.resolve(scriptDir, "../../data/legacy-export/PRESUPUESTO_DETALLE.ndjson");

  const legacyRows = await readLegacyBudgetDetailRows(filePath);

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
    throw new Error("No se encontro condominio activo para aplicar backfill de mapeo de grupos de egresos");
  }

  const mapping = new Map<string, { year: number; conceptId: number; groupId: number }>();

  for (const row of legacyRows) {
    if (!asBoolean(row.activo, false)) {
      continue;
    }

    const year = asInt(row.anio);
    const conceptId = asInt(row.id_cat_conceptos_presupuesto);
    const groupId = asInt(row.id_cat_grupos_presupuesto);

    if (year === null || conceptId === null || groupId === null) {
      continue;
    }

    const key = `${year}:${conceptId}`;
    if (!mapping.has(key)) {
      mapping.set(key, { year, conceptId, groupId });
    }
  }

  let scanned = 0;
  let upserted = 0;

  for (const entry of mapping.values()) {
    scanned += 1;

    await expenseConceptGroupMapModel.upsert({
      where: {
        condominiumId_year_legacyBudgetConceptId: {
          condominiumId: condominium.id,
          year: entry.year,
          legacyBudgetConceptId: entry.conceptId,
        },
      },
      update: {
        budgetGroupId: entry.groupId,
        source: "legacy_etl",
      },
      create: {
        condominiumId: condominium.id,
        year: entry.year,
        legacyBudgetConceptId: entry.conceptId,
        budgetGroupId: entry.groupId,
        source: "legacy_etl",
      },
    });

    upserted += 1;
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        condominiumName: condominium.name,
        sourceFile: filePath,
        scanned,
        upserted,
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
