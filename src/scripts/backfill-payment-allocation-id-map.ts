import { prisma } from "@/shared/infrastructure/db/prisma";

function readRunId(): string {
  const prefixed = "--runId=";
  const arg = process.argv.find((value) => value.startsWith(prefixed));
  if (!arg) {
    throw new Error("Debes indicar --runId=<migration-run-id>");
  }

  return arg.slice(prefixed.length);
}

async function resolveMappedId(input: {
  runId: string;
  legacyTable: string;
  legacyId: number | null;
  targetEntity: string;
}): Promise<string | null> {
  if (input.legacyId === null) {
    return null;
  }

  const map = await prisma.migrationIdMap.findUnique({
    where: {
      runId_legacyTable_legacyId_targetEntity: {
        runId: input.runId,
        legacyTable: input.legacyTable,
        legacyId: input.legacyId,
        targetEntity: input.targetEntity,
      },
    },
    select: { targetId: true },
  });

  return map?.targetId ?? null;
}

function asInt(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

async function main(): Promise<void> {
  const runId = readRunId();

  const rows = await prisma.legacyStagingRow.findMany({
    where: {
      runId,
      legacyTable: "HISTORICO_PAGOS_HAS_PAGOS",
      promotedAt: { not: null },
    },
    orderBy: { legacyId: "asc" },
    select: {
      legacyId: true,
      payload: true,
    },
  });

  let backfilled = 0;
  let missingDependencies = 0;
  let missingAllocation = 0;

  for (const row of rows) {
    const existing = await prisma.migrationIdMap.findUnique({
      where: {
        runId_legacyTable_legacyId_targetEntity: {
          runId,
          legacyTable: "HISTORICO_PAGOS_HAS_PAGOS",
          legacyId: row.legacyId,
          targetEntity: "PaymentAllocation",
        },
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const payload = row.payload as Record<string, unknown>;
    const paymentId = await resolveMappedId({
      runId,
      legacyTable: "HISTORICO_PAGOS",
      legacyId: asInt(payload.id_historico_pagos),
      targetEntity: "Payment",
    });

    const chargeId = await resolveMappedId({
      runId,
      legacyTable: "PAGOS",
      legacyId: asInt(payload.id_pagos),
      targetEntity: "Charge",
    });

    if (!paymentId || !chargeId) {
      missingDependencies += 1;
      continue;
    }

    const allocation = await prisma.paymentAllocation.findFirst({
      where: { paymentId, chargeId },
      select: { id: true },
    });

    if (!allocation) {
      missingAllocation += 1;
      continue;
    }

    await prisma.migrationIdMap.create({
      data: {
        runId,
        legacyTable: "HISTORICO_PAGOS_HAS_PAGOS",
        legacyId: row.legacyId,
        targetEntity: "PaymentAllocation",
        targetId: allocation.id,
      },
    });

    backfilled += 1;
  }

  console.log(
    JSON.stringify(
      {
        runId,
        scanned: rows.length,
        backfilled,
        missingDependencies,
        missingAllocation,
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
