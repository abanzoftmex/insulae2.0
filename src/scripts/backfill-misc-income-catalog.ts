import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyMiscIncomeCatalog = {
  id_dcat_varios?: unknown;
  nombre?: unknown;
  activo?: unknown;
  id_cat_grupos_cobro?: unknown;
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

function asBoolean(value: unknown, fallback = true): boolean {
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

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readLegacyRows(filePath: string): Promise<LegacyMiscIncomeCatalog[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyMiscIncomeCatalog);
}

async function main(): Promise<void> {
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="))?.split("=")[1];
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const filePath = fileArg ?? path.resolve(scriptDir, "../../data/legacy-export/DCAT_VARIOS.ndjson");

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
    throw new Error("No se encontro condominio activo para aplicar el backfill de DCAT_VARIOS");
  }

  const groups = await prisma.chargeGroup.findMany({
    where: {
      condominiumId: condominium.id,
      legacyId: { not: null },
    },
    select: {
      id: true,
      legacyId: true,
    },
  });

  const chargeGroupByLegacyId = new Map<number, string>(
    groups
      .filter((group): group is { id: string; legacyId: number } => group.legacyId !== null)
      .map((group) => [group.legacyId, group.id]),
  );

  let scanned = 0;
  let upserted = 0;
  let skipped = 0;

  for (const row of legacyRows) {
    scanned += 1;

    const legacyId = asInt(row.id_dcat_varios);
    if (legacyId === null) {
      skipped += 1;
      continue;
    }

    const name = asString(row.nombre) ?? `Vario ${legacyId}`;
    const legacyChargeGroupId = asInt(row.id_cat_grupos_cobro);
    const chargeGroupId =
      legacyChargeGroupId === null
        ? null
        : (chargeGroupByLegacyId.get(legacyChargeGroupId) ?? null);

    await prisma.miscIncomeCatalog.upsert({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId,
        },
      },
      create: {
        condominiumId: condominium.id,
        legacyId,
        name,
        isActive: asBoolean(row.activo, true),
        legacyChargeGroupId,
        chargeGroupId,
      },
      update: {
        name,
        isActive: asBoolean(row.activo, true),
        legacyChargeGroupId,
        chargeGroupId,
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
