import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

async function main(): Promise<void> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true, slug: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true, slug: true },
    }));

  if (!condominium) {
    throw new Error("No se encontró condominio activo");
  }

  // Build a map from legacyId → UUID for PrivateArea
  const areas = await prisma.privateArea.findMany({
    where: { condominiumId: condominium.id, legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });

  const areaByLegacyId = new Map<number, string>(
    areas
      .filter((a): a is { id: string; legacyId: number } => a.legacyId !== null)
      .map((a) => [a.legacyId, a.id]),
  );

  // Get all incomes that have a legacyPrivateAreaId but no privateAreaId
  const incomes = await prisma.income.findMany({
    where: {
      condominiumId: condominium.id,
      legacyPrivateAreaId: { not: null },
      privateAreaId: null,
    },
    select: { id: true, legacyPrivateAreaId: true },
  });

  let updated = 0;
  let unresolved = 0;

  for (const income of incomes) {
    const legacyAreaId = income.legacyPrivateAreaId;
    if (legacyAreaId === null) continue;

    const canonicalAreaId = areaByLegacyId.get(legacyAreaId);
    if (!canonicalAreaId) {
      unresolved += 1;
      continue;
    }

    await prisma.income.update({
      where: { id: income.id },
      data: { privateAreaId: canonicalAreaId },
    });
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        totalWithLegacyArea: incomes.length,
        updated,
        unresolved,
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
