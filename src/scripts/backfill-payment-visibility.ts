import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

function resolvePaymentVisibility(input: {
  legacyStatusCode: number | null;
  isLegacyActive: boolean | null;
  legacyAreaIsActive: boolean | null;
}): boolean {
  const hasLegacyContext =
    input.legacyStatusCode !== null ||
    input.isLegacyActive !== null ||
    input.legacyAreaIsActive !== null;

  if (!hasLegacyContext) {
    return true;
  }

  return (
    input.legacyStatusCode === 1 &&
    input.isLegacyActive === true &&
    input.legacyAreaIsActive === true
  );
}

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
    throw new Error("No se encontro condominio activo para backfill de Payment.isVisibleInFinancialSummary");
  }

  const payments = await prisma.payment.findMany({
    where: {
      condominiumId: condominium.id,
    },
    select: {
      id: true,
      legacyStatusCode: true,
      isLegacyActive: true,
      legacyAreaIsActive: true,
      isVisibleInFinancialSummary: true,
    },
  });

  let reviewed = 0;
  let updated = 0;
  let visibleTrue = 0;
  let visibleFalse = 0;

  for (const payment of payments) {
    reviewed += 1;

    const expected = resolvePaymentVisibility({
      legacyStatusCode: payment.legacyStatusCode,
      isLegacyActive: payment.isLegacyActive,
      legacyAreaIsActive: payment.legacyAreaIsActive,
    });

    if (payment.isVisibleInFinancialSummary !== expected) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { isVisibleInFinancialSummary: expected },
      });
      updated += 1;
    }

    if (expected) {
      visibleTrue += 1;
    } else {
      visibleFalse += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        reviewed,
        updated,
        visibleTrue,
        visibleFalse,
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
