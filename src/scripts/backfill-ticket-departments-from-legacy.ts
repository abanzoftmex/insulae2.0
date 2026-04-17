import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyTicketDepartmentPayload = {
  id_tickets_departamentos?: unknown;
  nombre?: unknown;
  email?: unknown;
  activo?: unknown;
};

type LegacyTicketPayload = {
  id_tickets?: unknown;
  id_tickets_departamentos?: unknown;
};

type SqlTicketDepartmentRow = {
  legacyId: number;
  name: string;
  email: string;
  isActive: boolean;
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

function normalizeEmail(value: string | null): string {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || "sin-correo@insulae.local";
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readNdjsonRows<T>(filePath: string): Promise<T[]> {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as T);
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

async function readDepartments(
  departmentsFile: string,
  dumpFile: string,
): Promise<SqlTicketDepartmentRow[]> {
  if (await fileExists(departmentsFile)) {
    const rows = await readNdjsonRows<LegacyTicketDepartmentPayload>(departmentsFile);

    const parsedRows = rows
      .map((row) => {
        const legacyId = asInt(row.id_tickets_departamentos);
        if (legacyId === null) {
          return null;
        }

        return {
          legacyId,
          name: asString(row.nombre)?.trim() || `Departamento ${legacyId}`,
          email: normalizeEmail(asString(row.email)),
          isActive: asBoolean(row.activo, true),
        };
      })
      .filter((row): row is SqlTicketDepartmentRow => row !== null);

    if (parsedRows.length > 0) {
      return parsedRows;
    }
  }

  const dump = await readFile(dumpFile, "utf8");
  const statementMatch = dump.match(/INSERT INTO `TICKETS_DEPARTAMENTOS` VALUES ([\s\S]*?);/);
  if (!statementMatch) {
    throw new Error("No se encontro INSERT INTO `TICKETS_DEPARTAMENTOS` en el dump legacy");
  }

  const tuples = splitSqlTuples(statementMatch[1]);
  return tuples
    .map((tuple) => parseTupleFields(tuple))
    .map((fields) => {
      const legacyId = asInt(fields[0]);
      if (legacyId === null) {
        return null;
      }

      return {
        legacyId,
        name: asString(fields[1])?.trim() || `Departamento ${legacyId}`,
        email: normalizeEmail(asString(fields[2])),
        isActive: asBoolean(fields[3], true),
      };
    })
    .filter((row): row is SqlTicketDepartmentRow => row !== null);
}

async function resolveCondominium(): Promise<{ id: string; slug: string; name: string } | null> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    }));

  return condominium ?? null;
}

async function main(): Promise<void> {
  const departmentsFileArg = process.argv.find((arg) => arg.startsWith("--departmentsFile="))?.split("=")[1];
  const ticketsFileArg = process.argv.find((arg) => arg.startsWith("--ticketsFile="))?.split("=")[1];
  const dumpFileArg = process.argv.find((arg) => arg.startsWith("--dumpFile="))?.split("=")[1];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const departmentsFile =
    departmentsFileArg ?? path.resolve(scriptDir, "../../data/legacy-export/TICKETS_DEPARTAMENTOS.ndjson");
  const ticketsFile = ticketsFileArg ?? path.resolve(scriptDir, "../../data/legacy-export/TICKETS.ndjson");
  const dumpFile = dumpFileArg ?? path.resolve(scriptDir, "../../docs/raw-db/full_dump.sql");

  const condominium = await resolveCondominium();
  if (!condominium) {
    throw new Error("No se encontro un condominio activo para ejecutar el backfill.");
  }

  const departments = await readDepartments(departmentsFile, dumpFile);
  const departmentMap = new Map<number, string>();

  let departmentsCreated = 0;
  let departmentsUpdated = 0;

  const ticketDepartmentModel = (
    prisma as unknown as {
      ticketDepartment: {
        findUnique(args: unknown): Promise<{ id: string } | null>;
        upsert(args: unknown): Promise<{ id: string }>;
      };
    }
  ).ticketDepartment;

  for (const row of departments) {
    const existing = await ticketDepartmentModel.findUnique({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId: row.legacyId,
        },
      },
      select: { id: true },
    });

    const department = await ticketDepartmentModel.upsert({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId: row.legacyId,
        },
      },
      create: {
        condominiumId: condominium.id,
        legacyId: row.legacyId,
        name: row.name,
        email: row.email,
        isActive: row.isActive,
      },
      update: {
        name: row.name,
        email: row.email,
        isActive: row.isActive,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      departmentsUpdated += 1;
    } else {
      departmentsCreated += 1;
    }

    departmentMap.set(row.legacyId, department.id);
  }

  let ticketsScanned = 0;
  let ticketsLinked = 0;
  let ticketsMissingDepartment = 0;
  let ticketsMissingRecord = 0;

  if (await fileExists(ticketsFile)) {
    const ticketRows = await readNdjsonRows<LegacyTicketPayload>(ticketsFile);

    for (const row of ticketRows) {
      ticketsScanned += 1;
      const ticketLegacyId = asInt(row.id_tickets);
      const departmentLegacyId = asInt(row.id_tickets_departamentos);

      if (ticketLegacyId === null || departmentLegacyId === null) {
        continue;
      }

      const departmentId = departmentMap.get(departmentLegacyId);
      if (!departmentId) {
        ticketsMissingDepartment += 1;
        continue;
      }

      const ticket = (await prisma.ticket.findUnique({
        where: {
          condominiumId_legacyId: {
            condominiumId: condominium.id,
            legacyId: ticketLegacyId,
          },
        },
        select: {
          id: true,
          departmentId: true,
        },
      } as unknown as Parameters<typeof prisma.ticket.findUnique>[0])) as {
        id: string;
        departmentId: string | null;
      } | null;

      if (!ticket) {
        ticketsMissingRecord += 1;
        continue;
      }

      if (ticket.departmentId === departmentId) {
        continue;
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { departmentId },
      } as unknown as Parameters<typeof prisma.ticket.update>[0]);

      ticketsLinked += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        condominium: {
          id: condominium.id,
          slug: condominium.slug,
          name: condominium.name,
        },
        departmentsProcessed: departments.length,
        departmentsCreated,
        departmentsUpdated,
        ticketsScanned,
        ticketsLinked,
        ticketsMissingDepartment,
        ticketsMissingRecord,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[backfill-ticket-departments]", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
