import { PROJECT_SCOPE } from "@/config/project-scope";
import { resolveChargeGroupKind } from "@/shared/domain/charge-group-kind";
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
    throw new Error("No se encontro condominio activo para backfill de ChargeGroup.kind");
  }

  const groups = await prisma.chargeGroup.findMany({
    where: {
      condominiumId: condominium.id,
    },
    select: {
      id: true,
      name: true,
      chargeType: true,
      kind: true,
    },
  });

  let updated = 0;

  for (const group of groups) {
    const kind = resolveChargeGroupKind({
      name: group.name,
      chargeType: group.chargeType,
    });

    if (group.kind === kind) {
      continue;
    }

    await prisma.chargeGroup.update({
      where: { id: group.id },
      data: { kind },
    });

    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        scanned: groups.length,
        updated,
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
