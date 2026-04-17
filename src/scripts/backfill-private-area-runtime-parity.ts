import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/shared/infrastructure/db/prisma";

type Row = Record<string, unknown>;

type LegacyAreaM2 = {
  m2Totales: number | null;
  m2Construction: number | null;
  m2CommonArea: number | null;
};

type LegacyRental = {
  rentalId: number;
  tenantName: string;
  statusId: number | null;
};

function toOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed);
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function readLegacyNdjson(filePath: string): Promise<Row[]> {
  const content = await readFile(filePath, "utf8");

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Row);
}

function splitSqlTuples(sqlValues: string): string[] {
  const tuples: string[] = [];
  let inString = false;
  let escaped = false;
  let depth = 0;
  let startIndex = -1;

  for (let index = 0; index < sqlValues.length; index += 1) {
    const char = sqlValues[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "'") {
        inString = false;
      }

      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === "(") {
      if (depth === 0) {
        startIndex = index + 1;
      }
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0 && startIndex >= 0) {
        tuples.push(sqlValues.slice(startIndex, index));
      }
    }
  }

  return tuples;
}

function parseSqlTuple(tupleContent: string): Array<string | number | null> {
  const values: Array<string | number | null> = [];
  let current = "";
  let inString = false;
  let escaped = false;
  let currentWasQuoted = false;

  const pushCurrent = () => {
    const trimmed = current.trim();

    if (currentWasQuoted) {
      values.push(current);
    } else if (!inString && trimmed.toUpperCase() === "NULL") {
      values.push(null);
    } else if (!inString && /^-?\d+(\.\d+)?$/.test(trimmed)) {
      values.push(Number(trimmed));
    } else {
      values.push(trimmed);
    }

    current = "";
    currentWasQuoted = false;
  };

  for (let index = 0; index <= tupleContent.length; index += 1) {
    const char = index === tupleContent.length ? "," : tupleContent[index];

    if (inString) {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "'") {
        inString = false;
        continue;
      }

      current += char;
      continue;
    }

    if (char === "'") {
      inString = true;
      currentWasQuoted = true;
      continue;
    }

    if (char === ",") {
      pushCurrent();
      continue;
    }

    current += char;
  }

  return values;
}

function isLegacyRentalStatusActive(statusId: number | null): boolean {
  return statusId === 1 || statusId === 2 || statusId === 3 || statusId === 4;
}

async function loadLegacyAreaM2ByLegacyId(rootPath: string): Promise<Map<number, LegacyAreaM2>> {
  const areasPath = path.resolve(rootPath, "data/legacy-export/AREAS_PRIVATIVAS.ndjson");
  const rows = await readLegacyNdjson(areasPath);

  const byLegacyId = new Map<number, LegacyAreaM2>();

  for (const row of rows) {
    const legacyId = toOptionalInt(row.id_areas_privativas);
    if (legacyId === null) {
      continue;
    }

    byLegacyId.set(legacyId, {
      m2Totales: toOptionalNumber(row.m2_totales),
      m2Construction: toOptionalNumber(row.m2_construccion),
      m2CommonArea: toOptionalNumber(row.m2_area_comun),
    });
  }

  return byLegacyId;
}

async function loadCommerceNameByLegacyId(rootPath: string): Promise<Map<number, string>> {
  const fullDumpPath = path.resolve(rootPath, "docs/raw-db/full_dump.sql");
  const sqlDump = await readFile(fullDumpPath, "utf8");
  const insertMatch = sqlDump.match(/INSERT INTO `DIRECTORIO_HAS_COMERCIOS` VALUES\s*([\s\S]+?);/);

  const commerceNameById = new Map<number, string>();

  if (!insertMatch) {
    return commerceNameById;
  }

  const tuples = splitSqlTuples(insertMatch[1]);

  for (const tuple of tuples) {
    const fields = parseSqlTuple(tuple);
    if (fields.length < 3) {
      continue;
    }

    const commerceId = toOptionalInt(fields[0]);
    const commerceName = normalizeOptionalString(fields[2]);

    if (commerceId !== null && commerceName) {
      commerceNameById.set(commerceId, commerceName);
    }
  }

  return commerceNameById;
}

async function loadLegacySecurityRentalByAreaLegacyId(rootPath: string): Promise<Map<number, LegacyRental>> {
  const rentalsPath = path.resolve(rootPath, "data/legacy-export/ARRENDAMIENTOS.ndjson");
  const rows = await readLegacyNdjson(rentalsPath);
  const commerceNameById = await loadCommerceNameByLegacyId(rootPath);

  const selectedByArea = new Map<number, LegacyRental>();

  for (const row of rows) {
    const areaLegacyId = toOptionalInt(row.id_areas_privativas);
    const rentalId = toOptionalInt(row.id_arrendamientos);
    const isActive = toOptionalInt(row.activo) === 1;
    const statusId = toOptionalInt(row.id_cat_status_comercios);

    if (
      areaLegacyId === null ||
      rentalId === null ||
      !isActive ||
      !isLegacyRentalStatusActive(statusId)
    ) {
      continue;
    }

    const commerceId = toOptionalInt(row.id_directorio_has_comercios);
    const tenantName =
      (commerceId !== null ? commerceNameById.get(commerceId) ?? null : null) ??
      normalizeOptionalString(row.nombre_comercio) ??
      normalizeOptionalString(row.razon_social_comercio);

    if (!tenantName) {
      continue;
    }

    const previous = selectedByArea.get(areaLegacyId);
    if (!previous || rentalId < previous.rentalId) {
      selectedByArea.set(areaLegacyId, {
        rentalId,
        tenantName,
        statusId,
      });
    }
  }

  return selectedByArea;
}

async function run(): Promise<void> {
  const rootPath = process.cwd();

  const [m2ByLegacyId, securityRentalByLegacyId] = await Promise.all([
    loadLegacyAreaM2ByLegacyId(rootPath),
    loadLegacySecurityRentalByAreaLegacyId(rootPath),
  ]);

  const privateAreas = await prisma.privateArea.findMany({
    select: {
      id: true,
      legacyId: true,
      condominiumId: true,
      m2Apole: true,
      m2Construction: true,
      m2CommonArea: true,
    },
  });

  let areaUpdates = 0;
  let rentalUpdates = 0;
  let rentalCreates = 0;

  for (const privateArea of privateAreas) {
    if (privateArea.legacyId === null) {
      continue;
    }

    const m2Snapshot = m2ByLegacyId.get(privateArea.legacyId);

    if (m2Snapshot) {
      const m2ApoleValue = privateArea.m2Apole === null ? null : Number(privateArea.m2Apole);
      const updateData: Record<string, unknown> = {};

      if ((m2ApoleValue === null || m2ApoleValue <= 0) && m2Snapshot.m2Totales !== null) {
        updateData.m2Apole = m2Snapshot.m2Totales;
      }

      if (privateArea.m2Construction === null && m2Snapshot.m2Construction !== null) {
        updateData.m2Construction = m2Snapshot.m2Construction;
      }

      if (privateArea.m2CommonArea === null && m2Snapshot.m2CommonArea !== null) {
        updateData.m2CommonArea = m2Snapshot.m2CommonArea;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.privateArea.update({
          where: { id: privateArea.id },
          data: updateData,
        });

        areaUpdates += 1;
      }
    }

    const rentalSnapshot = securityRentalByLegacyId.get(privateArea.legacyId);

    if (!rentalSnapshot) {
      continue;
    }

    const selectedRental = await prisma.rental.findFirst({
      where: {
        privateAreaId: privateArea.id,
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        tenantName: true,
        status: true,
      },
    });

    if (!selectedRental) {
      await prisma.rental.create({
        data: {
          condominiumId: privateArea.condominiumId,
          privateAreaId: privateArea.id,
          tenantName: rentalSnapshot.tenantName,
          status: String(rentalSnapshot.statusId ?? 1),
          startsAt: new Date(),
        },
      });

      rentalCreates += 1;
      continue;
    }

    const desiredStatus = String(rentalSnapshot.statusId ?? 1);
    const currentTenantName = selectedRental.tenantName?.trim() ?? "";
    const currentStatus = selectedRental.status?.trim() ?? "";

    if (currentTenantName === rentalSnapshot.tenantName && currentStatus === desiredStatus) {
      continue;
    }

    await prisma.rental.update({
      where: {
        id: selectedRental.id,
      },
      data: {
        tenantName: rentalSnapshot.tenantName,
        status: desiredStatus,
      },
    });

    rentalUpdates += 1;
  }

  console.log(
    JSON.stringify(
      {
        totalPrivateAreas: privateAreas.length,
        areaUpdates,
        rentalUpdates,
        rentalCreates,
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
