import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PaymentMethod } from "@prisma/client";

type LegacyIncomeRow = {
  id_ingresos?: unknown;
  fecha?: unknown;
  monto?: unknown;
  activo?: unknown;
  id_cat_formas_pago?: unknown;
  comentarios?: unknown;
  id_dcat_varios?: unknown;
  id_cat_grupos_cobro?: unknown;
  id_areas_privativas?: unknown;
  confirmado?: unknown;
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

function mapPaymentMethod(methodId: number | null): PaymentMethod {
  if (!methodId) return PaymentMethod.OTHER;
  switch (methodId) {
    case 1:
      return PaymentMethod.OTHER;
    case 2:
      return PaymentMethod.CASH;
    case 3:
      return PaymentMethod.TRANSFER;
    case 4:
      return PaymentMethod.CHECK;
    case 5:
      return PaymentMethod.CARD;
    case 6:
      return PaymentMethod.TRANSFER;
    default:
      return PaymentMethod.OTHER;
  }
}

async function readLegacyRows(filePath: string): Promise<LegacyIncomeRow[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyIncomeRow);
}

async function main(): Promise<void> {
  const filePath = path.resolve(__dirname, "../../data/legacy-export/INGRESOS.ndjson");

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
    throw new Error("No se encontro condominio activo");
  }

  console.log(`Resolved condominium: ${condominium.name} (${condominium.id})`);

  // 1. Fetch maps for catalog, area, group
  const catalogs = await prisma.miscIncomeCatalog.findMany({
    where: { condominiumId: condominium.id, legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const miscCatalogByLegacyId = new Map<number, string>(
    catalogs
      .filter((catalog): catalog is { id: string; legacyId: number } => catalog.legacyId !== null)
      .map((catalog) => [catalog.legacyId, catalog.id]),
  );

  const privateAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condominium.id, legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const areaByLegacyId = new Map<number, string>(
    privateAreas
      .filter((area): area is { id: string; legacyId: number } => area.legacyId !== null)
      .map((area) => [area.legacyId, area.id]),
  );

  const chargeGroups = await prisma.chargeGroup.findMany({
    where: { condominiumId: condominium.id, legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const groupByLegacyId = new Map<number, string>(
    chargeGroups
      .filter((group): group is { id: string; legacyId: number } => group.legacyId !== null)
      .map((group) => [group.legacyId, group.id]),
  );

  // 2. Clean up existing corrupted records:
  // Reset miscCatalogId and legacyMiscCatalogId to null on all records where legacyId is the original payment ID (i.e. <= 10000000)
  console.log("Cleaning up corrupted legacy misc catalog fields on payment-based incomes...");
  const cleaned = await prisma.income.updateMany({
    where: {
      condominiumId: condominium.id,
      legacyId: {
        lte: 10000000,
      },
      OR: [
        { legacyMiscCatalogId: { not: null } },
        { miscCatalogId: { not: null } },
      ],
    },
    data: {
      legacyMiscCatalogId: null,
      miscCatalogId: null,
    },
  });
  console.log(`Cleaned up ${cleaned.count} corrupted income records.`);

  // 3. Delete existing imported other incomes if they were imported under 10000000+ offset
  const deletedOld = await prisma.income.deleteMany({
    where: {
      condominiumId: condominium.id,
      legacyId: {
        gt: 10000000,
      },
    },
  });
  console.log(`Deleted ${deletedOld.count} previously imported other income records with offset IDs.`);

  // 4. Import the new records
  console.log("Importing actual other incomes from INGRESOS.ndjson...");
  let importedCount = 0;
  let skippedCount = 0;

  for (const row of legacyRows) {
    const id = asInt(row.id_ingresos);
    if (id === null) {
      skippedCount++;
      continue;
    }

    const legacyMiscCatalogId = asInt(row.id_dcat_varios);
    const canonicalMiscCatalogId = legacyMiscCatalogId !== null ? miscCatalogByLegacyId.get(legacyMiscCatalogId) ?? null : null;

    const legacyPrivateAreaId = asInt(row.id_areas_privativas);
    const privateAreaId = legacyPrivateAreaId !== null ? areaByLegacyId.get(legacyPrivateAreaId) ?? null : null;

    const legacyChargeGroupId = asInt(row.id_cat_grupos_cobro);
    const chargeGroupId = legacyChargeGroupId !== null ? groupByLegacyId.get(legacyChargeGroupId) ?? null : null;

    const dateRaw = typeof row.fecha === "string" ? row.fecha : null;
    if (!dateRaw) {
      skippedCount++;
      continue;
    }
    const date = new Date(dateRaw);

    const amount = asNumber(row.monto) ?? 0;
    const comments = typeof row.comentarios === "string" ? row.comentarios : "";
    const concept = comments.trim().length > 0 ? comments.trim() : "Ingreso legacy";

    const paymentMethod = mapPaymentMethod(asInt(row.id_cat_formas_pago));

    // We use a high offset legacyId to store the id_ingresos, preventing constraint collisions
    const targetLegacyId = 10000000 + id;

    await prisma.income.create({
      data: {
        condominiumId: condominium.id,
        legacyId: targetLegacyId,
        date,
        concept,
        amount,
        paymentMethod,
        notes: comments,
        isActive: asBoolean(row.activo, true),
        isConfirmed: asBoolean(row.confirmado, false),
        legacyMiscCatalogId,
        miscCatalogId: canonicalMiscCatalogId,
        legacyPrivateAreaId,
        privateAreaId,
        legacyChargeGroupId,
        chargeGroupId,
      },
    });

    importedCount++;
  }

  console.log(`Import finished! Imported: ${importedCount}, Skipped: ${skippedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
