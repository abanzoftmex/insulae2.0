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
    throw new Error("No se encontro condominio activo para backfill de Income.chargeGroupId");
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

  const incomes = await prisma.income.findMany({
    where: {
      condominiumId: condominium.id,
      legacyChargeGroupId: { not: null },
    },
    select: {
      id: true,
      legacyChargeGroupId: true,
      chargeGroupId: true,
    },
  });

  let reviewed = 0;
  let updated = 0;
  let alreadyAligned = 0;
  let unresolved = 0;
  const unresolvedLegacyGroupIds = new Set<number>();

  for (const income of incomes) {
    reviewed += 1;

    const legacyChargeGroupId = income.legacyChargeGroupId;
    if (legacyChargeGroupId === null) {
      continue;
    }

    const canonicalChargeGroupId = chargeGroupByLegacyId.get(legacyChargeGroupId) ?? null;
    if (!canonicalChargeGroupId) {
      unresolved += 1;
      unresolvedLegacyGroupIds.add(legacyChargeGroupId);
      continue;
    }

    if (income.chargeGroupId === canonicalChargeGroupId) {
      alreadyAligned += 1;
      continue;
    }

    await prisma.income.update({
      where: { id: income.id },
      data: { chargeGroupId: canonicalChargeGroupId },
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
        unresolvedLegacyGroupIds: [...unresolvedLegacyGroupIds].sort((a, b) => a - b),
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
