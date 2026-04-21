import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

async function main(): Promise<void> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: { id: true, slug: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true, slug: true },
    }));

  if (!condominium) {
    throw new Error("No se encontro condominio activo para backfill de Income.miscCatalogId");
  }

  const catalogs = await prisma.miscIncomeCatalog.findMany({
    where: {
      condominiumId: condominium.id,
      legacyId: { not: null },
    },
    select: {
      id: true,
      legacyId: true,
    },
  });

  const miscCatalogByLegacyId = new Map<number, string>(
    catalogs
      .filter((catalog): catalog is { id: string; legacyId: number } => catalog.legacyId !== null)
      .map((catalog) => [catalog.legacyId, catalog.id]),
  );

  const incomes = await prisma.income.findMany({
    where: {
      condominiumId: condominium.id,
      legacyMiscCatalogId: { not: null },
    },
    select: {
      id: true,
      legacyMiscCatalogId: true,
      miscCatalogId: true,
    },
  });

  let reviewed = 0;
  let updated = 0;
  let alreadyAligned = 0;
  let unresolved = 0;
  const unresolvedLegacyMiscCatalogIds = new Set<number>();

  for (const income of incomes) {
    reviewed += 1;

    const legacyMiscCatalogId = income.legacyMiscCatalogId;
    if (legacyMiscCatalogId === null) {
      continue;
    }

    const canonicalMiscCatalogId = miscCatalogByLegacyId.get(legacyMiscCatalogId) ?? null;
    if (!canonicalMiscCatalogId) {
      unresolved += 1;
      unresolvedLegacyMiscCatalogIds.add(legacyMiscCatalogId);
      continue;
    }

    if (income.miscCatalogId === canonicalMiscCatalogId) {
      alreadyAligned += 1;
      continue;
    }

    await prisma.income.update({
      where: { id: income.id },
      data: { miscCatalogId: canonicalMiscCatalogId },
    });

    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        reviewed,
        updated,
        alreadyAligned,
        unresolved,
        unresolvedLegacyMiscCatalogIds: [...unresolvedLegacyMiscCatalogIds].sort((a, b) => a - b),
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
