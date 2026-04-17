import { readFile } from "node:fs/promises";
import path from "node:path";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyRentalRow = {
  id_arrendamientos?: unknown;
  id_directorio_has_comercios?: unknown;
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

async function loadLegacyRentalCommerceByRentalId(rootPath: string): Promise<Map<number, number>> {
  const rentalsPath = path.resolve(rootPath, "data/legacy-export/ARRENDAMIENTOS.ndjson");
  const content = await readFile(rentalsPath, "utf8");

  const byRentalLegacyId = new Map<number, number>();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const row = JSON.parse(trimmed) as LegacyRentalRow;
    const rentalLegacyId = asInt(row.id_arrendamientos);
    const commerceLegacyId = asInt(row.id_directorio_has_comercios);

    if (rentalLegacyId === null || commerceLegacyId === null) {
      continue;
    }

    byRentalLegacyId.set(rentalLegacyId, commerceLegacyId);
  }

  return byRentalLegacyId;
}

async function loadLegacyCommerceContactsByCommerceId(
  rootPath: string,
): Promise<Map<number, { administrativeLegacyUserId: number | null; operativeLegacyUserId: number | null }>> {
  const fullDumpPath = path.resolve(rootPath, "docs/raw-db/full_dump.sql");
  const sqlDump = await readFile(fullDumpPath, "utf8");
  const insertMatch = sqlDump.match(/INSERT INTO `DIRECTORIO_HAS_COMERCIOS` VALUES\s*([\s\S]+?);/);

  const contactsByCommerceId = new Map<
    number,
    { administrativeLegacyUserId: number | null; operativeLegacyUserId: number | null }
  >();

  if (!insertMatch) {
    return contactsByCommerceId;
  }

  const tuples = splitSqlTuples(insertMatch[1]);

  for (const tuple of tuples) {
    const fields = parseTupleFields(tuple);
    if (fields.length < 10) {
      continue;
    }

    const commerceLegacyId = asInt(fields[0]);
    const administrativeLegacyUserId = asInt(fields[8]);
    const operativeLegacyUserId = asInt(fields[9]);

    if (commerceLegacyId === null) {
      continue;
    }

    contactsByCommerceId.set(commerceLegacyId, {
      administrativeLegacyUserId,
      operativeLegacyUserId,
    });
  }

  return contactsByCommerceId;
}

async function run(): Promise<void> {
  const rootPath = process.cwd();

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

  const [
    users,
    rentals,
    legacyRentalCommerceByRentalLegacyId,
    legacyCommerceContactsByCommerceId,
  ] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.rental.findMany({
      where: {
        condominiumId: condominium.id,
      },
      select: {
        id: true,
      },
    }),
    loadLegacyRentalCommerceByRentalId(rootPath),
    loadLegacyCommerceContactsByCommerceId(rootPath),
  ]);

  const userIdByLegacyId = new Map<number, string>();
  for (const user of users) {
    if (user.legacyId !== null) {
      userIdByLegacyId.set(user.legacyId, user.id);
    }
  }

  const rentalIds = rentals.map((rental) => rental.id);
  const legacyRentalIdByRentalId = new Map<string, number>();

  if (rentalIds.length > 0) {
    const rentalMaps = await prisma.migrationIdMap.findMany({
      where: {
        legacyTable: "ARRENDAMIENTOS",
        targetEntity: "Rental",
        targetId: {
          in: rentalIds,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        legacyId: true,
        targetId: true,
      },
    });

    for (const mapping of rentalMaps) {
      if (!legacyRentalIdByRentalId.has(mapping.targetId)) {
        legacyRentalIdByRentalId.set(mapping.targetId, mapping.legacyId);
      }
    }
  }

  let updatedRows = 0;
  let skippedWithoutCommerce = 0;
  let skippedWithoutRentalMap = 0;

  for (const [rentalId, rentalLegacyId] of legacyRentalIdByRentalId.entries()) {
    const commerceLegacyId = legacyRentalCommerceByRentalLegacyId.get(rentalLegacyId) ?? null;

    if (commerceLegacyId === null) {
      skippedWithoutCommerce += 1;
      continue;
    }

    const commerceContacts = legacyCommerceContactsByCommerceId.get(commerceLegacyId) ?? null;
    const administrativeContactUserId =
      commerceContacts?.administrativeLegacyUserId !== null &&
      commerceContacts?.administrativeLegacyUserId !== undefined
        ? userIdByLegacyId.get(commerceContacts.administrativeLegacyUserId) ?? null
        : null;
    const operativeContactUserId =
      commerceContacts?.operativeLegacyUserId !== null &&
      commerceContacts?.operativeLegacyUserId !== undefined
        ? userIdByLegacyId.get(commerceContacts.operativeLegacyUserId) ?? null
        : null;

    await prisma.rental.update({
      where: {
        id: rentalId,
      },
      data: {
        administrativeContactUserId,
        operativeContactUserId,
      },
    });

    updatedRows += 1;
  }

  skippedWithoutRentalMap = rentalIds.length - legacyRentalIdByRentalId.size;

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        rentalsInCondominium: rentalIds.length,
        rentalsMappedFromLegacy: legacyRentalIdByRentalId.size,
        legacyRentalsWithCommerce: legacyRentalCommerceByRentalLegacyId.size,
        updatedRows,
        skippedWithoutCommerce,
        skippedWithoutRentalMap,
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
