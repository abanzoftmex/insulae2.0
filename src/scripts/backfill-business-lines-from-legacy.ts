/**
 * Backfill de giros comerciales desde el legacy 1.0 hacia el esquema 2.0.
 *
 * Fuentes:
 *  - data/legacy-export/DCAT_GIROS.ndjson
 *  - data/legacy-export/DCAT_CATEGORIAS_COMERCIAL.ndjson
 *  - data/legacy-export/DCAT_SUBCATEGORIAS_COMERCIAL.ndjson
 *  - data/legacy-export/DCAT_CLASES_COMERCIOS.ndjson
 *  - data/legacy-export/ARRENDAMIENTOS.ndjson (slots giro0..giro3 + clase + legacyId)
 *
 * El vínculo ARRENDAMIENTOS -> Rental se resuelve vía MigrationIdMap
 * (legacyTable = 'ARRENDAMIENTOS', targetEntity = 'Rental'), quedándose con el
 * targetId que siga existiendo en la tabla Rental.
 *
 * Idempotente: catálogos y slots se upsertean por legacyId / (rentalId, slot).
 *
 * Uso:
 *   npx tsx --env-file=.env.local --tsconfig tsconfig.json src/scripts/backfill-business-lines-from-legacy.ts [--dry-run]
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

const DRY_RUN = process.argv.includes("--dry-run");
const EXPORT_DIR = path.join(process.cwd(), "data", "legacy-export");

type LegacyRow = Record<string, unknown>;

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readNdjson(fileName: string): Promise<LegacyRow[]> {
  const filePath = path.join(EXPORT_DIR, fileName);
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LegacyRow);
}

async function main() {
  const condominium = await prisma.condominium.findUnique({
    where: { slug: PROJECT_SCOPE.condominiumCode },
    select: { id: true, name: true },
  });
  if (!condominium) {
    throw new Error(`Condominio '${PROJECT_SCOPE.condominiumCode}' no encontrado`);
  }
  const condominiumId = condominium.id;
  console.log(`Condominio: ${condominium.name} (${condominiumId})${DRY_RUN ? " [DRY RUN]" : ""}`);

  const [giros, categorias, subcategorias, clases, arrendamientos] = await Promise.all([
    readNdjson("DCAT_GIROS.ndjson"),
    readNdjson("DCAT_CATEGORIAS_COMERCIAL.ndjson"),
    readNdjson("DCAT_SUBCATEGORIAS_COMERCIAL.ndjson"),
    readNdjson("DCAT_CLASES_COMERCIOS.ndjson"),
    readNdjson("ARRENDAMIENTOS.ndjson"),
  ]);
  console.log(
    `Legacy: ${giros.length} giros, ${categorias.length} categorías, ${subcategorias.length} subcategorías, ${clases.length} clases, ${arrendamientos.length} arrendamientos`,
  );

  // 1. Catálogo de giros
  const giroIdByLegacy = new Map<number, string>();
  for (const row of giros) {
    const legacyId = asInt(row.id_dcat_giros);
    const name = asString(row.nombre);
    if (legacyId === null || !name) continue;
    const data = {
      name,
      code: asString(row.clave),
      isActive: asInt(row.activo) !== 0 && row.deleted_at == null,
    };
    if (DRY_RUN) {
      giroIdByLegacy.set(legacyId, `dry-${legacyId}`);
      continue;
    }
    const saved = await prisma.businessLineCatalog.upsert({
      where: { condominiumId_legacyId: { condominiumId, legacyId } },
      create: { condominiumId, legacyId, ...data },
      update: data,
    });
    giroIdByLegacy.set(legacyId, saved.id);
  }
  console.log(`Giros upserteados: ${giroIdByLegacy.size}`);

  // 2. Categorías
  const categoriaIdByLegacy = new Map<number, string>();
  for (const row of categorias) {
    const legacyId = asInt(row.id_dcat_categorias_comercial);
    const legacyGiroId = asInt(row.id_dcat_giros);
    const name = asString(row.nombre);
    if (legacyId === null || legacyGiroId === null || !name) continue;
    const businessLineId = giroIdByLegacy.get(legacyGiroId);
    if (!businessLineId) {
      console.warn(`  Categoría ${legacyId} '${name}': giro legacy ${legacyGiroId} desconocido, se omite`);
      continue;
    }
    const data = {
      businessLineId,
      name,
      code: asString(row.clave),
      isActive: asInt(row.activo) !== 0 && row.deleted_at == null,
    };
    if (DRY_RUN) {
      categoriaIdByLegacy.set(legacyId, `dry-${legacyId}`);
      continue;
    }
    const saved = await prisma.businessCategoryCatalog.upsert({
      where: { condominiumId_legacyId: { condominiumId, legacyId } },
      create: { condominiumId, legacyId, ...data },
      update: data,
    });
    categoriaIdByLegacy.set(legacyId, saved.id);
  }
  console.log(`Categorías upserteadas: ${categoriaIdByLegacy.size}`);

  // 3. Subcategorías
  const subcategoriaIdByLegacy = new Map<number, string>();
  for (const row of subcategorias) {
    const legacyId = asInt(row.id_dcat_subcategorias_comercial);
    const legacyCategoriaId = asInt(row.id_dcat_categorias_comercial);
    const legacyGiroId = asInt(row.id_dcat_giros);
    const name = asString(row.nombre);
    if (legacyId === null || legacyCategoriaId === null || legacyGiroId === null || !name) continue;
    const categoryId = categoriaIdByLegacy.get(legacyCategoriaId);
    const businessLineId = giroIdByLegacy.get(legacyGiroId);
    if (!categoryId || !businessLineId) {
      console.warn(`  Subcategoría ${legacyId} '${name}': categoría/giro legacy desconocido, se omite`);
      continue;
    }
    const data = {
      categoryId,
      businessLineId,
      name,
      code: asString(row.clave),
      isActive: asInt(row.activo) !== 0 && row.deleted_at == null,
    };
    if (DRY_RUN) {
      subcategoriaIdByLegacy.set(legacyId, `dry-${legacyId}`);
      continue;
    }
    const saved = await prisma.businessSubcategoryCatalog.upsert({
      where: { condominiumId_legacyId: { condominiumId, legacyId } },
      create: { condominiumId, legacyId, ...data },
      update: data,
    });
    subcategoriaIdByLegacy.set(legacyId, saved.id);
  }
  console.log(`Subcategorías upserteadas: ${subcategoriaIdByLegacy.size}`);

  // 4. Resolver mapeo legacy ARRENDAMIENTOS -> Rental vivo
  const idMaps = await prisma.migrationIdMap.findMany({
    where: { legacyTable: "ARRENDAMIENTOS", targetEntity: "Rental" },
    select: { legacyId: true, targetId: true },
  });
  const liveRentalIds = new Set(
    (await prisma.rental.findMany({ where: { condominiumId }, select: { id: true } })).map((r) => r.id),
  );
  const rentalIdByLegacy = new Map<number, string>();
  for (const map of idMaps) {
    if (liveRentalIds.has(map.targetId)) {
      rentalIdByLegacy.set(map.legacyId, map.targetId);
    }
  }
  console.log(`Mapeos ARRENDAMIENTOS→Rental vivos: ${rentalIdByLegacy.size} de ${liveRentalIds.size} rentals`);

  const claseNameByLegacy = new Map<number, string>();
  for (const row of clases) {
    const legacyId = asInt(row.id_dcat_clases_comercios);
    const name = asString(row.nombre);
    if (legacyId !== null && name) claseNameByLegacy.set(legacyId, name);
  }

  // 5. Slots de giro por arrendamiento + legacyId/clase en Rental
  let rentalsUpdated = 0;
  let slotsWritten = 0;
  let slotsSkipped = 0;
  let unmatchedRentals = 0;
  for (const row of arrendamientos) {
    const legacyId = asInt(row.id_arrendamientos);
    if (legacyId === null) continue;
    const rentalId = rentalIdByLegacy.get(legacyId);
    if (!rentalId) {
      unmatchedRentals += 1;
      continue;
    }

    const legacyClaseId = asInt(row.id_dcat_clases_comercios);
    const businessClass = legacyClaseId !== null ? (claseNameByLegacy.get(legacyClaseId) ?? null) : null;

    if (!DRY_RUN) {
      await prisma.rental.update({
        where: { id: rentalId },
        data: { legacyId, businessClass },
      });
    }
    rentalsUpdated += 1;

    for (let slot = 0; slot < 4; slot += 1) {
      const legacyGiroId = asInt(row[`id_dcat_giros${slot}`]);
      if (!legacyGiroId) continue; // 0 o null = slot vacío
      const businessLineId = giroIdByLegacy.get(legacyGiroId);
      if (!businessLineId) {
        slotsSkipped += 1;
        continue;
      }
      const legacyCategoriaId = asInt(row[`id_dcat_categorias_comercial${slot}`]);
      const legacySubcategoriaId = asInt(row[`id_dcat_subcategorias_comercial${slot}`]);
      const categoryId = legacyCategoriaId ? (categoriaIdByLegacy.get(legacyCategoriaId) ?? null) : null;
      const subcategoryId = legacySubcategoriaId ? (subcategoriaIdByLegacy.get(legacySubcategoriaId) ?? null) : null;

      if (!DRY_RUN) {
        await prisma.rentalBusinessLine.upsert({
          where: { rentalId_slot: { rentalId, slot } },
          create: { condominiumId, rentalId, slot, businessLineId, categoryId, subcategoryId },
          update: { businessLineId, categoryId, subcategoryId },
        });
      }
      slotsWritten += 1;
    }
  }

  console.log(`Rentals actualizados (legacyId/clase): ${rentalsUpdated}`);
  console.log(`Slots de giro escritos: ${slotsWritten} (omitidos por giro desconocido: ${slotsSkipped})`);
  console.log(`Arrendamientos legacy sin Rental vivo: ${unmatchedRentals}`);

  // Resumen final
  if (!DRY_RUN) {
    const withLine = await prisma.rental.count({
      where: { condominiumId, businessLines: { some: {} } },
    });
    console.log(`Rentals con al menos un giro: ${withLine}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
