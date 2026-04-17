import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyDirectoryRow = {
  id_directorio?: unknown;
  requiereFactura?: unknown;
};

type DirectoryCommerceTuple = {
  tupleLegacyId: number;
  directoryLegacyId: number;
  commerceName: string;
  isActive: boolean;
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

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "si", "sí", "yes"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function splitSqlTuples(valuesSegment: string): string[] {
  const tuples: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (let index = 0; index < valuesSegment.length; index += 1) {
    const char = valuesSegment[index];

    if (inString) {
      if (char === "\\" && index + 1 < valuesSegment.length) {
        if (depth > 0) {
          current += char;
          current += valuesSegment[index + 1];
        }
        index += 1;
        continue;
      }

      if (char === "'") {
        inString = false;
      }

      if (depth > 0) {
        current += char;
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      if (depth > 0) {
        current += char;
      }
      continue;
    }

    if (char === "(") {
      depth += 1;
      if (depth === 1) {
        current = "";
        continue;
      }
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        tuples.push(current);
        current = "";
        continue;
      }
    }

    if (depth > 0) {
      current += char;
    }
  }

  return tuples;
}

function parseSqlLiteral(token: string): string | null {
  const trimmed = token.trim();
  if (trimmed.length === 0) {
    return "";
  }

  if (trimmed.toUpperCase() === "NULL") {
    return null;
  }

  return trimmed;
}

function parseTupleFields(tupleContent: string): Array<string | null> {
  const fields: Array<string | null> = [];
  let token = "";
  let inString = false;

  for (let index = 0; index < tupleContent.length; index += 1) {
    const char = tupleContent[index];

    if (inString) {
      if (char === "\\" && index + 1 < tupleContent.length) {
        token += tupleContent[index + 1];
        index += 1;
        continue;
      }

      if (char === "'") {
        inString = false;
        continue;
      }

      token += char;
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === ",") {
      fields.push(parseSqlLiteral(token));
      token = "";
      continue;
    }

    token += char;
  }

  fields.push(parseSqlLiteral(token));
  return fields;
}

async function loadRequiresInvoiceByLegacyId(rootPath: string): Promise<Map<number, boolean>> {
  const filePath = path.resolve(rootPath, "data/legacy-export/DIRECTORIO.ndjson");
  const content = await readFile(filePath, "utf8");

  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyDirectoryRow);

  const byLegacyId = new Map<number, boolean>();

  for (const row of rows) {
    const legacyId = asInt(row.id_directorio);
    const requiresInvoice = asBoolean(row.requiereFactura);

    if (legacyId === null || requiresInvoice === null) {
      continue;
    }

    byLegacyId.set(legacyId, requiresInvoice);
  }

  return byLegacyId;
}

async function loadCommercesFromDump(rootPath: string): Promise<DirectoryCommerceTuple[]> {
  const dumpPath = path.resolve(rootPath, "docs/raw-db/full_dump.sql");
  const sqlDump = await readFile(dumpPath, "utf8");
  const statementMatch = sqlDump.match(/INSERT INTO `DIRECTORIO_HAS_COMERCIOS` VALUES ([\s\S]*?);/);

  if (!statementMatch) {
    throw new Error("No se encontro INSERT INTO `DIRECTORIO_HAS_COMERCIOS` en full_dump.sql");
  }

  return splitSqlTuples(statementMatch[1])
    .map((tuple) => parseTupleFields(tuple))
    .map((fields) => {
      const tupleLegacyId = asInt(fields[0]);
      const directoryLegacyId = asInt(fields[1]);
      const commerceName = normalizeString(fields[2]);
      const isActive = asBoolean(fields[5]) ?? false;

      if (tupleLegacyId === null || directoryLegacyId === null || commerceName === null) {
        return null;
      }

      return {
        tupleLegacyId,
        directoryLegacyId,
        commerceName,
        isActive,
      } satisfies DirectoryCommerceTuple;
    })
    .filter((row): row is DirectoryCommerceTuple => row !== null)
    .sort((a, b) => a.tupleLegacyId - b.tupleLegacyId);
}

async function run(): Promise<void> {
  const rootPath = process.cwd();

  const [requiresInvoiceByLegacyId, legacyCommerces] = await Promise.all([
    loadRequiresInvoiceByLegacyId(rootPath),
    loadCommercesFromDump(rootPath),
  ]);

  const users = await prisma.user.findMany({
    where: {
      legacyId: {
        not: null,
      },
    },
    select: {
      id: true,
      legacyId: true,
      condominiumId: true,
    },
  });

  const userByLegacyId = new Map<number, { id: string; condominiumId: string }>();
  for (const user of users) {
    if (user.legacyId !== null) {
      userByLegacyId.set(user.legacyId, {
        id: user.id,
        condominiumId: user.condominiumId,
      });
    }
  }

  for (const [legacyId, requiresInvoice] of requiresInvoiceByLegacyId.entries()) {
    const mapped = userByLegacyId.get(legacyId);
    if (!mapped) {
      continue;
    }

    await prisma.user.update({
      where: {
        id: mapped.id,
      },
      data: {
        requiresInvoice,
      },
    });
  }

  await prisma.userCommerce.deleteMany({});

  const sortOrderByUserId = new Map<string, number>();
  const toCreate: Array<{
    id: string;
    condominiumId: string;
    userId: string;
    commerceName: string;
    sortOrder: number;
    isActive: boolean;
  }> = [];

  for (const commerce of legacyCommerces) {
    if (!commerce.isActive) {
      continue;
    }

    const mapped = userByLegacyId.get(commerce.directoryLegacyId);
    if (!mapped) {
      continue;
    }

    const sortOrder = (sortOrderByUserId.get(mapped.id) ?? 0) + 1;
    sortOrderByUserId.set(mapped.id, sortOrder);

    toCreate.push({
      id: randomUUID(),
      condominiumId: mapped.condominiumId,
      userId: mapped.id,
      commerceName: commerce.commerceName,
      sortOrder,
      isActive: true,
    });
  }

  if (toCreate.length > 0) {
    await prisma.userCommerce.createMany({
      data: toCreate,
    });
  }

  const [invoiceNullRows, adminRows, adolfoInvoice] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(*)::int AS cnt FROM "User" WHERE "isActive" = true AND "requiresInvoice" IS NULL`,
    ),
    prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(*)::int AS cnt
       FROM "UserCommerce" uc
       JOIN "User" u ON u.id = uc."userId"
       WHERE u."legacyId" = 812 AND uc."isActive" = true`,
    ),
    prisma.$queryRawUnsafe<Array<{ requiresInvoice: boolean | null }>>(
      `SELECT "requiresInvoice" FROM "User" WHERE "legacyId" = 2 LIMIT 1`,
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        requiresInvoiceNullActiveUsers: invoiceNullRows[0]?.cnt ?? 0,
        adminLegacy812CommerceRows: adminRows[0]?.cnt ?? 0,
        adolfoLegacy2RequiresInvoice: adolfoInvoice[0]?.requiresInvoice ?? null,
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
