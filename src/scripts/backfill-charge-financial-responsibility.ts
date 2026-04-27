import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

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

function asMonth(value: unknown): number | null {
  const parsed = asInt(value);
  if (parsed === null) {
    return null;
  }

  return parsed >= 1 && parsed <= 12 ? parsed : null;
}

function toLedgerStatus(idCatStatusPago: number | null, montoAbonado: number | null, monto: number | null):
  | "OPEN"
  | "PARTIAL"
  | "PAID"
  | "CANCELED" {
  if (idCatStatusPago === 2 || idCatStatusPago === 4) {
    return "CANCELED";
  }
  if (monto !== null && montoAbonado !== null && montoAbonado >= monto) {
    return "PAID";
  }
  if (montoAbonado !== null && montoAbonado > 0) {
    return "PARTIAL";
  }
  return "OPEN";
}

type LegacyChargePayload = {
  id_arrendamientos?: unknown;
  id_opcion_estado_cuenta?: unknown;
  id_cat_status_pago?: unknown;
  anio?: unknown;
  mes?: unknown;
  montoAbonado?: unknown;
  monto?: unknown;
  interesMoratorio?: unknown;
  descuento?: unknown;
  activo?: unknown;
};

async function run(): Promise<void> {
  const applyChanges = process.argv.includes("--apply");
  const runIdArg = process.argv
    .find((arg) => arg.startsWith("--runId="))
    ?.split("=")[1]
    ?.trim();

  const condominium = await prisma.condominium.findFirst({
    where: {
      slug: PROJECT_SCOPE.condominiumCode,
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!condominium) {
    throw new Error(`No se encontro condominio activo para slug ${PROJECT_SCOPE.condominiumCode}`);
  }

  const sourceRun = runIdArg
    ? await prisma.migrationRun.findUnique({
        where: { id: runIdArg },
        select: { id: true },
      })
    : await prisma.migrationRun.findFirst({
        where: {
          stagingRows: {
            some: {
              legacyTable: "PAGOS",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
        },
      });

  if (!sourceRun) {
    throw new Error(
      runIdArg
        ? `No se encontro MigrationRun con id ${runIdArg}`
        : "No se encontro un MigrationRun con staging de PAGOS para traducir payload legacy.",
    );
  }

  const charges = await prisma.charge.findMany({
    where: {
      condominiumId: condominium.id,
      legacyId: {
        not: null,
      },
    },
    select: {
      id: true,
      legacyId: true,
    },
  });

  const legacyIds = charges.map((charge) => charge.legacyId).filter((legacyId): legacyId is number => legacyId !== null);

  if (legacyIds.length === 0) {
    console.log("No hay cargos con legacyId para backfill.");
    return;
  }

  const stagingRows = await prisma.legacyStagingRow.findMany({
    where: {
      runId: sourceRun.id,
      legacyTable: "PAGOS",
      legacyId: {
        in: legacyIds,
      },
    },
    select: {
      legacyId: true,
      payload: true,
      extractedAt: true,
    },
    orderBy: {
      extractedAt: "desc",
    },
  });

  const payloadByLegacyId = new Map<number, LegacyChargePayload>();
  for (const row of stagingRows) {
    if (!payloadByLegacyId.has(row.legacyId)) {
      payloadByLegacyId.set(row.legacyId, row.payload as LegacyChargePayload);
    }
  }

  const rentalLegacyIds = [...new Set(
    [...payloadByLegacyId.values()]
      .map((payload) => asInt(payload.id_arrendamientos))
      .filter((legacyId): legacyId is number => legacyId !== null),
  )];

  const rentalIdByLegacyId = new Map<number, string>();
  if (rentalLegacyIds.length > 0) {
    const rentalMaps = await prisma.migrationIdMap.findMany({
      where: {
        runId: sourceRun.id,
        legacyTable: "ARRENDAMIENTOS",
        targetEntity: "Rental",
        legacyId: {
          in: rentalLegacyIds,
        },
      },
      select: {
        legacyId: true,
        targetId: true,
      },
    });

    for (const rentalMap of rentalMaps) {
      rentalIdByLegacyId.set(rentalMap.legacyId, rentalMap.targetId);
    }
  }

  let touched = 0;
  let skipped = 0;
  let missingPayload = 0;

  for (const charge of charges) {
    if (charge.legacyId === null) {
      skipped += 1;
      continue;
    }

    const payload = payloadByLegacyId.get(charge.legacyId);
    if (!payload) {
      missingPayload += 1;
      continue;
    }

    // Legacy: id_opcion_estado_cuenta = 2 → Propietario (OWNER)
    //         id_opcion_estado_cuenta = 1 → Comercio    (COMMERCE)
    const responsibility = asInt(payload.id_opcion_estado_cuenta) === 2 ? "OWNER" : "COMMERCE";
    const tenancyId = (() => {
      const rentalLegacyId = asInt(payload.id_arrendamientos);
      if (rentalLegacyId === null) {
        return null;
      }
      return rentalIdByLegacyId.get(rentalLegacyId) ?? null;
    })();

    const paidAmount = asNumber(payload.montoAbonado) ?? 0;
    const amount = asNumber(payload.monto) ?? 0;
    const interestAmount = asNumber(payload.interesMoratorio) ?? 0;
    const discountAmount = asNumber(payload.descuento) ?? 0;
    const legacyStatusCode = asInt(payload.id_cat_status_pago);
    const status = toLedgerStatus(legacyStatusCode, paidAmount, amount);
    const periodYear = asInt(payload.anio);
    const periodMonth = asMonth(payload.mes);
    const isCollectible = asBoolean(payload.activo, true);

    touched += 1;

    if (!applyChanges) {
      continue;
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE "Charge"
      SET
        "tenancyId" = $1,
        "responsibility" = $2::"ChargeResponsibility",
        "paidAmount" = $3,
        "interestAmount" = $4,
        "discountAmount" = $5,
        "isCollectible" = $6,
        "legacyStatusCode" = $7,
        "status" = $8::"LedgerStatus",
        "periodYear" = COALESCE($9, "periodYear"),
        "periodMonth" = COALESCE($10, "periodMonth")
      WHERE "id" = $11
      `,
      tenancyId,
      responsibility,
      paidAmount,
      interestAmount,
      discountAmount,
      isCollectible,
      legacyStatusCode,
      status,
      periodYear,
      periodMonth,
      charge.id,
    );
  }

  console.log("Backfill de responsabilidad financiera de Charge");
  console.log(`Condominio: ${condominium.slug}`);
  console.log(`Run fuente: ${sourceRun.id}`);
  console.log(`Cargos analizados: ${charges.length}`);
  console.log(`Cargos actualizados: ${touched}`);
  console.log(`Cargos sin cambios: ${skipped}`);
  console.log(`Cargos sin payload legacy: ${missingPayload}`);
  console.log(`Modo: ${applyChanges ? "APPLY" : "DRY RUN (agrega --apply para persistir)"}`);
}

run()
  .catch((error) => {
    console.error("Fallo en backfill-charge-financial-responsibility:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
