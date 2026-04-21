import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { CHARGE_GROUP_KIND } from "@/shared/domain/charge-group-kind";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyPagoRow = {
  activo?: unknown;
  id_areas_privativas?: unknown;
  id_cat_grupos_cobro?: unknown;
  id_cat_status_pago?: unknown;
  monto?: unknown;
  montoAbonado?: unknown;
  fechaPago?: unknown;
};

type LegacyAreaRow = {
  activo?: unknown;
  id_areas_privativas?: unknown;
};

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

function parseNdjson<T>(content: string): T[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
}

function emptySeries(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function toFixed2(value: number): number {
  return Number(value.toFixed(2));
}

async function main(): Promise<void> {
  const yearArg = process.argv.find((arg) => arg.startsWith("--year="))?.split("=")[1];
  const year = yearArg ? Number.parseInt(yearArg, 10) : 2025;
  const nextYear = year + 1;

  if (!Number.isFinite(year)) {
    throw new Error("Year invalido");
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const pagosPath = path.resolve(scriptDir, "../../data/legacy-export/PAGOS.ndjson");
  const areasPath = path.resolve(scriptDir, "../../data/legacy-export/AREAS_PRIVATIVAS.ndjson");

  const [pagosRaw, areasRaw] = await Promise.all([
    readFile(pagosPath, "utf8"),
    readFile(areasPath, "utf8"),
  ]);

  const pagos = parseNdjson<LegacyPagoRow>(pagosRaw);
  const areas = parseNdjson<LegacyAreaRow>(areasRaw);

  const activeAreaIds = new Set<number>(
    areas
      .filter((row) => asInt(row.activo) === 1)
      .map((row) => asInt(row.id_areas_privativas))
      .filter((value): value is number => value !== null),
  );

  const groups = new Set([2, 4, 5, 7]);
  const expectedCurrent = emptySeries();
  const expectedNext = emptySeries();
  let expectedOverdue = 0;

  for (const pago of pagos) {
    if (asInt(pago.activo) !== 1) {
      continue;
    }

    const areaId = asInt(pago.id_areas_privativas);
    if (areaId === null || !activeAreaIds.has(areaId)) {
      continue;
    }

    const groupId = asInt(pago.id_cat_grupos_cobro);
    if (groupId === null || !groups.has(groupId)) {
      continue;
    }

    const status = asInt(pago.id_cat_status_pago);
    const amount = asNumber(pago.monto) ?? 0;
    const paidAmount = asNumber(pago.montoAbonado) ?? 0;
    const outstanding = amount - paidAmount;

    if (!Number.isFinite(outstanding) || outstanding <= 0) {
      continue;
    }

    const paidAt = new Date(String(pago.fechaPago ?? ""));
    if (Number.isNaN(paidAt.getTime())) {
      continue;
    }

    const paidYear = paidAt.getUTCFullYear();
    const paidMonth = paidAt.getUTCMonth();

    if (status !== 2 && paidYear === year) {
      expectedCurrent[paidMonth] += outstanding;
    }

    if (status !== 2 && paidYear === nextYear) {
      expectedNext[paidMonth] += outstanding;
    }

    if (status === 3 && paidYear < year - 1) {
      expectedOverdue += outstanding;
    }
  }

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
    throw new Error("No se encontro condominio activo para validar CxC");
  }

  const charges = await prisma.charge.findMany({
    where: {
      condominiumId: condominium.id,
      isCollectible: true,
      status: { not: "CANCELED" },
      periodYear: {
        gte: Math.max(2000, year - 20),
        lte: nextYear,
      },
      privateArea: {
        isActive: true,
      },
      chargeGroup: {
        isActive: true,
        kind: {
          in: [
            CHARGE_GROUP_KIND.ORDINARY,
            CHARGE_GROUP_KIND.STC,
            CHARGE_GROUP_KIND.SANCTION,
            CHARGE_GROUP_KIND.COMODATO,
          ],
        },
      },
    },
    select: {
      periodYear: true,
      periodMonth: true,
      amount: true,
      paidAmount: true,
      status: true,
    },
  });

  const actualCurrent = emptySeries();
  const actualNext = emptySeries();
  let actualOverdue = 0;

  for (const charge of charges) {
    const outstanding = Number(charge.amount) - Number(charge.paidAmount);
    if (!Number.isFinite(outstanding) || outstanding <= 0) {
      continue;
    }

    const month = charge.periodMonth - 1;
    const validMonth = month >= 0 && month < 12;

    if (charge.periodYear === year && charge.status !== "CANCELED") {
      if (validMonth) {
        actualCurrent[month] += outstanding;
      }
      continue;
    }

    if (charge.periodYear === nextYear && charge.status !== "CANCELED") {
      if (validMonth) {
        actualNext[month] += outstanding;
      }
      continue;
    }

    if (charge.status === "OPEN" && charge.periodYear < year - 1) {
      actualOverdue += outstanding;
    }
  }

  const monthMismatches = expectedCurrent
    .map((expected, index) => {
      const actual = actualCurrent[index] ?? 0;
      const diff = toFixed2(expected - actual);
      return {
        month: index + 1,
        expected: toFixed2(expected),
        actual: toFixed2(actual),
        diff,
      };
    })
    .filter((row) => row.diff !== 0);

  const totals = {
    expectedCurrent: toFixed2(expectedCurrent.reduce((acc, value) => acc + value, 0)),
    actualCurrent: toFixed2(actualCurrent.reduce((acc, value) => acc + value, 0)),
    expectedNext: toFixed2(expectedNext.reduce((acc, value) => acc + value, 0)),
    actualNext: toFixed2(actualNext.reduce((acc, value) => acc + value, 0)),
    expectedOverdue: toFixed2(expectedOverdue),
    actualOverdue: toFixed2(actualOverdue),
  };

  const parityOk =
    totals.expectedCurrent === totals.actualCurrent &&
    totals.expectedNext === totals.actualNext &&
    totals.expectedOverdue === totals.actualOverdue &&
    monthMismatches.length === 0;

  console.log(
    JSON.stringify(
      {
        year,
        condominium: condominium.slug,
        parityOk,
        monthMismatches,
        totals,
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
