import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyHistoricPayment = {
  id_historico_pagos?: unknown;
  id_areas_privativas?: unknown;
  id_cat_status_historico_pagos?: unknown;
  activo?: unknown;
};

type LegacyPrivateArea = {
  id_areas_privativas?: unknown;
  activo?: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asInt(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function asBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value !== "0" && value.toLowerCase() !== "false";
  }

  return typeof value === "boolean" ? value : fallback;
}

async function readLegacyHistoricPayments(filePath: string): Promise<LegacyHistoricPayment[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyHistoricPayment);
}

async function readLegacyPrivateAreas(filePath: string): Promise<LegacyPrivateArea[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyPrivateArea);
}

async function main(): Promise<void> {
  const paymentFileArg = process.argv.find((arg) => arg.startsWith("--paymentFile="))?.split("=")[1];
  const areaFileArg = process.argv.find((arg) => arg.startsWith("--areaFile="))?.split("=")[1];
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const paymentFilePath =
    paymentFileArg ?? path.resolve(scriptDir, "../../data/legacy-export/HISTORICO_PAGOS.ndjson");
  const areaFilePath =
    areaFileArg ?? path.resolve(scriptDir, "../../data/legacy-export/AREAS_PRIVATIVAS.ndjson");

  const [legacyRows, legacyAreas] = await Promise.all([
    readLegacyHistoricPayments(paymentFilePath),
    readLegacyPrivateAreas(areaFilePath),
  ]);

  if (legacyRows.length === 0) {
    throw new Error(`No se encontraron registros en ${paymentFilePath}`);
  }

  const areaActiveById = new Map<number, boolean>();
  for (const area of legacyAreas) {
    const areaLegacyId = asInt(area.id_areas_privativas);
    if (areaLegacyId === null) {
      continue;
    }

    areaActiveById.set(areaLegacyId, asBoolean(area.activo, true));
  }

  const legacyById = new Map<
    number,
    {
      legacyStatusCode: number | null;
      isLegacyActive: boolean;
      legacyAreaId: number | null;
      legacyAreaIsActive: boolean | null;
    }
  >();

  for (const row of legacyRows) {
    const legacyId = asInt(row.id_historico_pagos);
    if (legacyId === null) {
      continue;
    }

    legacyById.set(legacyId, {
      legacyStatusCode: asInt(row.id_cat_status_historico_pagos),
      isLegacyActive: asBoolean(row.activo, true),
      legacyAreaId: asInt(row.id_areas_privativas),
      legacyAreaIsActive:
        asInt(row.id_areas_privativas) === null
          ? null
          : (areaActiveById.get(asInt(row.id_areas_privativas) as number) ?? null),
    });
  }

  const condominiums = await prisma.condominium.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true },
  });

  let totalUpdated = 0;

  for (const condominium of condominiums) {
    const [payments, privateAreas] = await Promise.all([
      prisma.payment.findMany({
        where: {
          condominiumId: condominium.id,
          legacyId: { not: null },
        },
        select: {
          id: true,
          legacyId: true,
          privateAreaId: true,
          legacyStatusCode: true,
          isLegacyActive: true,
          legacyAreaCode: true,
          legacyAreaIsActive: true,
        },
      }),
      prisma.privateArea.findMany({
        where: {
          condominiumId: condominium.id,
          legacyId: { not: null },
        },
        select: {
          id: true,
          legacyId: true,
        },
      }),
    ]);

    const privateAreaByLegacyId = new Map<number, string>();
    for (const area of privateAreas) {
      if (area.legacyId !== null) {
        privateAreaByLegacyId.set(area.legacyId, area.id);
      }
    }

    const updates = payments
      .map((payment) => {
        const legacyId = payment.legacyId;
        if (legacyId === null) {
          return null;
        }

        const legacy = legacyById.get(legacyId);
        if (!legacy) {
          return null;
        }

        const resolvedPrivateAreaId =
          legacy.legacyAreaId === null ? null : (privateAreaByLegacyId.get(legacy.legacyAreaId) ?? null);

        const changed =
          payment.privateAreaId !== resolvedPrivateAreaId ||
          payment.legacyStatusCode !== legacy.legacyStatusCode ||
          payment.isLegacyActive !== legacy.isLegacyActive ||
          payment.legacyAreaCode !== legacy.legacyAreaId ||
          payment.legacyAreaIsActive !== legacy.legacyAreaIsActive;

        if (!changed) {
          return null;
        }

        return {
          id: payment.id,
          privateAreaId: resolvedPrivateAreaId,
          legacyStatusCode: legacy.legacyStatusCode,
          isLegacyActive: legacy.isLegacyActive,
          legacyAreaCode: legacy.legacyAreaId,
          legacyAreaIsActive: legacy.legacyAreaIsActive,
        };
      })
      .filter(
        (
          value,
        ): value is {
          id: string;
          privateAreaId: string | null;
          legacyStatusCode: number | null;
          isLegacyActive: boolean;
          legacyAreaCode: number | null;
          legacyAreaIsActive: boolean | null;
        } => value !== null,
      );

    for (let index = 0; index < updates.length; index += 25) {
      const chunk = updates.slice(index, index + 25);
      if (chunk.length > 0) {
        await Promise.all(
          chunk.map((entry) =>
            prisma.payment.update({
              where: { id: entry.id },
              data: {
                privateAreaId: entry.privateAreaId,
                legacyStatusCode: entry.legacyStatusCode,
                isLegacyActive: entry.isLegacyActive,
                legacyAreaCode: entry.legacyAreaCode,
                legacyAreaIsActive: entry.legacyAreaIsActive,
              },
            }),
          ),
        );
      }
    }

    totalUpdated += updates.length;

    console.log(
      JSON.stringify(
        {
          condominium: condominium.slug,
          condominiumName: condominium.name,
          scannedPayments: payments.length,
          updatedPayments: updates.length,
        },
        null,
        2,
      ),
    );
  }

  console.log(
    JSON.stringify(
      {
        sourceFile: paymentFilePath,
        areaFile: areaFilePath,
        legacyRows: legacyRows.length,
        legacyAreas: legacyAreas.length,
        updatedPayments: totalUpdated,
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
