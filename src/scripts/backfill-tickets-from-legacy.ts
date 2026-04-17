import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyTicketPayload = {
  id_tickets?: unknown;
  fecha?: unknown;
  activo?: unknown;
  id_cat_status_tickets?: unknown;
  respuesta?: unknown;
  fecha_respuesta_usuario?: unknown;
  pdf_respuesta?: unknown;
  imagen_respuesta?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

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

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function toTicketStatus(idCatStatusTicket: number | null): "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" {
  switch (idCatStatusTicket) {
    case 2:
      return "CLOSED";
    case 3:
      return "IN_PROGRESS";
    case 4:
      return "RESOLVED";
    default:
      return "OPEN";
  }
}

function normalizeLegacyTicketAsset(
  folder: "imagenes" | "pdf",
  rawValue: unknown,
): { path: string | null; url: string | null } {
  const value = asString(rawValue)?.trim() ?? "";
  if (!value) {
    return { path: null, url: null };
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return { path: null, url: value };
  }

  const normalized = value.replace(/^\/+/, "");
  let filePath: string;

  if (normalized.startsWith("imagenes/tickets/")) {
    filePath = normalized;
  } else if (normalized.startsWith("tickets/")) {
    filePath = `imagenes/${normalized}`;
  } else if (normalized.startsWith(`${folder}/`)) {
    filePath = `imagenes/tickets/${normalized}`;
  } else {
    filePath = `imagenes/tickets/${folder}/${normalized}`;
  }

  return { path: filePath, url: null };
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

async function readLegacyTickets(ticketsFile: string, dumpFile: string): Promise<LegacyTicketPayload[]> {
  if (await fileExists(ticketsFile)) {
    const rows = await readNdjsonRows<LegacyTicketPayload>(ticketsFile);
    if (rows.length > 0) {
      return rows;
    }
  }

  const dump = await readFile(dumpFile, "utf8");
  const statementMatch = dump.match(/INSERT INTO `TICKETS` VALUES ([\s\S]*?);/);
  if (!statementMatch) {
    throw new Error("No se encontro INSERT INTO `TICKETS` en el dump legacy");
  }

  const tuples = splitSqlTuples(statementMatch[1]);
  return tuples
    .map((tuple) => parseTupleFields(tuple))
    .map((fields) => ({
      id_tickets: fields[0],
      fecha: fields[4],
      activo: fields[5],
      id_cat_status_tickets: fields[7],
      respuesta: fields[8],
      fecha_respuesta_usuario: fields[10],
      pdf_respuesta: fields[11],
      imagen_respuesta: fields[12],
    }));
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
  const ticketsFileArg = process.argv.find((arg) => arg.startsWith("--ticketsFile="))?.split("=")[1];
  const dumpFileArg = process.argv.find((arg) => arg.startsWith("--dumpFile="))?.split("=")[1];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const ticketsFile = ticketsFileArg ?? path.resolve(scriptDir, "../../data/legacy-export/TICKETS.ndjson");
  const dumpFile = dumpFileArg ?? path.resolve(scriptDir, "../../docs/raw-db/full_dump.sql");

  const condominium = await resolveCondominium();
  if (!condominium) {
    throw new Error("No se encontro un condominio activo para ejecutar el backfill.");
  }

  const rows = await readLegacyTickets(ticketsFile, dumpFile);

  let scanned = 0;
  let updated = 0;
  let missingTicket = 0;

  for (const row of rows) {
    scanned += 1;

    const legacyId = asInt(row.id_tickets);
    if (legacyId === null) {
      continue;
    }

    const ticket = (await prisma.ticket.findUnique({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId,
        },
      },
      select: {
        id: true,
      },
    } as unknown as Parameters<typeof prisma.ticket.findUnique>[0])) as { id: string } | null;

    if (!ticket) {
      missingTicket += 1;
      continue;
    }

    const status = toTicketStatus(asInt(row.id_cat_status_tickets));
    const respondedAt = asDate(row.fecha_respuesta_usuario);
    const pdfAsset = normalizeLegacyTicketAsset("pdf", row.pdf_respuesta);
    const imageAsset = normalizeLegacyTicketAsset("imagenes", row.imagen_respuesta);

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status,
        isActive: asBoolean(row.activo, true),
        response: asString(row.respuesta),
        respondedAt,
        responsePdfUrl: pdfAsset.url,
        responsePdfPath: pdfAsset.path,
        responseImageUrl: imageAsset.url,
        responseImagePath: imageAsset.path,
        closedAt: status === "CLOSED" ? respondedAt ?? asDate(row.fecha) ?? new Date() : null,
      },
    } as unknown as Parameters<typeof prisma.ticket.update>[0]);

    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        condominium: {
          id: condominium.id,
          slug: condominium.slug,
          name: condominium.name,
        },
        scanned,
        updated,
        missingTicket,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[backfill-tickets]", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
