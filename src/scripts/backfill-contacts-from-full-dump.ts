import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type ContactTuple = {
  legacyId: number;
  contactTypeLegacyId: number;
  name: string;
  value: string;
  isActive: boolean;
  linkUrl: string;
  linkTarget: "SAME_TAB" | "NEW_TAB";
  sortOrder: number;
};

type LegacyContactTypePayload = {
  id_cat_tipos_contacto?: unknown;
  nombre?: unknown;
  activo?: unknown;
};

const FALLBACK_CONTACT_TYPE_BY_LEGACY_ID: Record<number, string> = {
  1: "Direccion",
  2: "Email",
  3: "Telefono",
  4: "WhatsApp",
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
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

function toLinkTarget(value: string | null): "SAME_TAB" | "NEW_TAB" {
  return value === "_blank" ? "NEW_TAB" : "SAME_TAB";
}

function parseSqlLiteral(token: string): string | null {
  const normalized = token.trim();
  if (normalized.length === 0) {
    return "";
  }

  if (normalized.toUpperCase() === "NULL") {
    return null;
  }

  return normalized;
}

function splitSqlTuples(valuesSegment: string): string[] {
  const tuples: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (let i = 0; i < valuesSegment.length; i += 1) {
    const char = valuesSegment[i];

    if (inString) {
      if (char === "\\" && i + 1 < valuesSegment.length) {
        if (depth > 0) {
          current += char;
          current += valuesSegment[i + 1];
        }
        i += 1;
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

function parseTupleFields(tupleContent: string): Array<string | null> {
  const fields: Array<string | null> = [];
  let token = "";
  let inString = false;

  for (let i = 0; i < tupleContent.length; i += 1) {
    const char = tupleContent[i];

    if (inString) {
      if (char === "\\" && i + 1 < tupleContent.length) {
        token += tupleContent[i + 1];
        i += 1;
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

function parseContactsFromSqlDump(sqlDump: string): ContactTuple[] {
  const statementMatch = sqlDump.match(/INSERT INTO `CONTACTOS` VALUES ([\s\S]*?);/);
  if (!statementMatch) {
    throw new Error("No se encontro INSERT INTO `CONTACTOS` en el dump legacy");
  }

  const tuples = splitSqlTuples(statementMatch[1]);

  return tuples
    .map((tuple) => parseTupleFields(tuple))
    .map((fields) => {
      const legacyId = asInt(fields[0]);
      const contactTypeLegacyId = asInt(fields[1]);

      if (legacyId === null || contactTypeLegacyId === null) {
        throw new Error("Fila de CONTACTOS invalida: id_contactos o id_cat_tipos_contacto faltante");
      }

      return {
        legacyId,
        contactTypeLegacyId,
        name: asString(fields[2]) ?? `Contacto ${legacyId}`,
        value: asString(fields[3]) ?? "",
        isActive: asBoolean(fields[4], true),
        linkUrl: asString(fields[5]) ?? asString(fields[3]) ?? "",
        linkTarget: toLinkTarget(asString(fields[6])),
        sortOrder: asInt(fields[7]) ?? 0,
      } satisfies ContactTuple;
    });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readLegacyTypeNames(filePath: string): Promise<Map<number, { name: string; isActive: boolean }>> {
  const typeMap = new Map<number, { name: string; isActive: boolean }>();

  if (!(await fileExists(filePath))) {
    return typeMap;
  }

  const content = await readFile(filePath, "utf8");
  const rows = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LegacyContactTypePayload);

  for (const row of rows) {
    const legacyId = asInt(row.id_cat_tipos_contacto);
    const name = asString(row.nombre);

    if (legacyId === null) {
      continue;
    }

    typeMap.set(legacyId, {
      name: name ?? FALLBACK_CONTACT_TYPE_BY_LEGACY_ID[legacyId] ?? `Tipo ${legacyId}`,
      isActive: asBoolean(row.activo, true),
    });
  }

  return typeMap;
}

async function main(): Promise<void> {
  const dumpArg = process.argv.find((arg) => arg.startsWith("--dumpFile="))?.split("=")[1];
  const typesArg = process.argv.find((arg) => arg.startsWith("--typesFile="))?.split("=")[1];
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));

  const dumpFile = dumpArg ?? path.resolve(scriptDir, "../../docs/raw-db/full_dump.sql");
  const typesFile = typesArg ?? path.resolve(scriptDir, "../../data/legacy-export/CAT_TIPOS_CONTACTO.ndjson");

  const sqlDump = await readFile(dumpFile, "utf8");
  const contacts = parseContactsFromSqlDump(sqlDump);

  if (contacts.length === 0) {
    throw new Error("No se encontraron contactos para migrar");
  }

  const typeNames = await readLegacyTypeNames(typesFile);

  const condominium =
    (await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true, slug: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true },
    }));

  if (!condominium) {
    throw new Error("No existe condominio activo para importar contactos");
  }

  const distinctTypeIds = Array.from(new Set(contacts.map((row) => row.contactTypeLegacyId))).sort((a, b) => a - b);
  const typeIdMap = new Map<number, string>();

  for (const legacyTypeId of distinctTypeIds) {
    const fromFile = typeNames.get(legacyTypeId);
    const contactType = await prisma.contactType.upsert({
      where: { legacyId: legacyTypeId },
      create: {
        legacyId: legacyTypeId,
        name: fromFile?.name ?? FALLBACK_CONTACT_TYPE_BY_LEGACY_ID[legacyTypeId] ?? `Tipo ${legacyTypeId}`,
        isActive: fromFile?.isActive ?? true,
      },
      update: {
        name: fromFile?.name ?? FALLBACK_CONTACT_TYPE_BY_LEGACY_ID[legacyTypeId] ?? `Tipo ${legacyTypeId}`,
        isActive: fromFile?.isActive ?? true,
      },
      select: { id: true },
    });

    typeIdMap.set(legacyTypeId, contactType.id);
  }

  let upserted = 0;
  for (const row of contacts) {
    const contactTypeId = typeIdMap.get(row.contactTypeLegacyId);
    if (!contactTypeId) {
      continue;
    }

    await prisma.contactEntry.upsert({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId: row.legacyId,
        },
      },
      create: {
        condominiumId: condominium.id,
        legacyId: row.legacyId,
        contactTypeId,
        name: row.name,
        value: row.value,
        linkUrl: row.linkUrl,
        linkTarget: row.linkTarget,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      },
      update: {
        contactTypeId,
        name: row.name,
        value: row.value,
        linkUrl: row.linkUrl,
        linkTarget: row.linkTarget,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      },
    });

    upserted += 1;
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        migratedContacts: upserted,
        detectedContactsInDump: contacts.length,
        distinctContactTypes: distinctTypeIds.length,
        dumpFile,
        typesFileUsed: (await fileExists(typesFile)) ? typesFile : null,
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
