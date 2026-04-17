import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyNotificationPayload = {
  id_notificaciones?: unknown;
  id_cat_tipos_notificaciones?: unknown;
  id_dcat_categorias_notificaciones?: unknown;
  nombre?: unknown;
  descripcion?: unknown;
  fechaPublicar?: unknown;
  fechaVigencia?: unknown;
  imagen?: unknown;
  pdf?: unknown;
};

type LegacyNotificationCategoryPayload = {
  id_dcat_categorias_notificaciones?: unknown;
  nombre?: unknown;
  activo?: unknown;
};

type NotificationBackfillSnapshot = {
  id: string;
  category: string | null;
  categoryId: string | null;
  sentAt: Date | null;
  validUntil: Date | null;
  imageUrl: string | null;
  imagePath: string | null;
  pdfUrl: string | null;
  pdfPath: string | null;
};

const FALLBACK_NOTIFICATION_CATEGORY_BY_LEGACY_ID: Record<number, string> = {
  1: "Experiencias",
  2: "Condominal",
  3: "Comisiones",
  4: "Seguridad",
};

const LEGACY_NOTIFICATION_BASE_URL = "https://sistemasabanza.com/insulae";

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

function normalizeLegacyNotificationAsset(
  folder: "imagen" | "pdf",
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
  let assetPath: string;

  if (normalized.startsWith("imagenes/notificaciones/")) {
    assetPath = normalized;
  } else if (normalized.startsWith("notificaciones/")) {
    assetPath = `imagenes/${normalized}`;
  } else if (normalized.startsWith(`${folder}/`)) {
    assetPath = `imagenes/notificaciones/${normalized}`;
  } else {
    assetPath = `imagenes/notificaciones/${folder}/${normalized}`;
  }

  return {
    path: assetPath,
    url: `${LEGACY_NOTIFICATION_BASE_URL}/${assetPath}`,
  };
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

async function readNotificationCategories(
  categoriesFile: string,
  dumpFile: string,
): Promise<Array<{ legacyId: number; name: string; isActive: boolean }>> {
  if (await fileExists(categoriesFile)) {
    const rows = await readNdjsonRows<LegacyNotificationCategoryPayload>(categoriesFile);

    const parsedRows = rows
      .map((row) => {
        const legacyId = asInt(row.id_dcat_categorias_notificaciones);
        if (legacyId === null) {
          return null;
        }

        return {
          legacyId,
          name:
            asString(row.nombre) ??
            FALLBACK_NOTIFICATION_CATEGORY_BY_LEGACY_ID[legacyId] ??
            `Categoria ${legacyId}`,
          isActive: asBoolean(row.activo, true),
        };
      })
      .filter((row): row is { legacyId: number; name: string; isActive: boolean } => row !== null);

    if (parsedRows.length > 0) {
      return parsedRows;
    }
  }

  const dump = await readFile(dumpFile, "utf8");
  const statementMatch = dump.match(/INSERT INTO `DCAT_CATEGORIAS_NOTIFICACIONES` VALUES ([\s\S]*?);/);
  if (!statementMatch) {
    throw new Error("No se encontro INSERT INTO `DCAT_CATEGORIAS_NOTIFICACIONES` en el dump legacy");
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
        name:
          asString(fields[1]) ??
          FALLBACK_NOTIFICATION_CATEGORY_BY_LEGACY_ID[legacyId] ??
          `Categoria ${legacyId}`,
        isActive: asBoolean(fields[2], true),
      };
    })
    .filter((row): row is { legacyId: number; name: string; isActive: boolean } => row !== null);
}

async function main(): Promise<void> {
  const notificationsFileArg = process.argv.find((arg) => arg.startsWith("--notificationsFile="))?.split("=")[1];
  const categoriesFileArg = process.argv.find((arg) => arg.startsWith("--categoriesFile="))?.split("=")[1];
  const dumpFileArg = process.argv.find((arg) => arg.startsWith("--dumpFile="))?.split("=")[1];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const notificationsFile =
    notificationsFileArg ?? path.resolve(scriptDir, "../../data/legacy-export/NOTIFICACIONES.ndjson");
  const categoriesFile =
    categoriesFileArg ??
    path.resolve(scriptDir, "../../data/legacy-export/DCAT_CATEGORIAS_NOTIFICACIONES.ndjson");
  const dumpFile = dumpFileArg ?? path.resolve(scriptDir, "../../docs/raw-db/full_dump.sql");

  const legacyNotifications = await readNdjsonRows<LegacyNotificationPayload>(notificationsFile);
  if (legacyNotifications.length === 0) {
    throw new Error(`No se encontraron notificaciones en ${notificationsFile}`);
  }

  const legacyCategories = await readNotificationCategories(categoriesFile, dumpFile);
  if (legacyCategories.length === 0) {
    throw new Error("No se encontraron categorias de notificaciones para backfill");
  }

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
    throw new Error("No existe condominio activo para ejecutar backfill de notificaciones");
  }

  const categoryIdByLegacy = new Map<number, string>();
  for (const category of legacyCategories) {
    const upserted = await prisma.notificationCategory.upsert({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId: category.legacyId,
        },
      },
      create: {
        condominiumId: condominium.id,
        legacyId: category.legacyId,
        name: category.name,
        isActive: category.isActive,
      },
      update: {
        name: category.name,
        isActive: category.isActive,
      },
      select: { id: true },
    });

    categoryIdByLegacy.set(category.legacyId, upserted.id);
  }

  let notificationsFound = 0;
  let notificationsMissing = 0;
  let notificationsUpdated = 0;

  for (const legacyNotification of legacyNotifications) {
    const legacyId = asInt(legacyNotification.id_notificaciones);
    if (legacyId === null) {
      continue;
    }

    const existing = (await (prisma as any).notification.findUnique({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId,
        },
      },
      select: {
        id: true,
        category: true,
        categoryId: true,
        sentAt: true,
        validUntil: true,
        imageUrl: true,
        imagePath: true,
        pdfUrl: true,
        pdfPath: true,
      },
    })) as NotificationBackfillSnapshot | null;

    if (!existing) {
      notificationsMissing += 1;
      continue;
    }

    notificationsFound += 1;

    const legacyTypeId = asInt(legacyNotification.id_cat_tipos_notificaciones);
    const legacyCategoryId = asInt(legacyNotification.id_dcat_categorias_notificaciones);
    const resolvedCategoryId = legacyCategoryId === null ? null : (categoryIdByLegacy.get(legacyCategoryId) ?? null);

    const legacyImage = normalizeLegacyNotificationAsset("imagen", legacyNotification.imagen);
    const legacyPdf = normalizeLegacyNotificationAsset("pdf", legacyNotification.pdf);

    const nextCategory =
      existing.category ??
      (legacyTypeId !== null ? `${legacyTypeId}` : asString(legacyNotification.id_cat_tipos_notificaciones));
    const nextCategoryId = existing.categoryId ?? resolvedCategoryId;
    const nextSentAt = existing.sentAt ?? asDate(legacyNotification.fechaPublicar);
    const nextValidUntil = existing.validUntil ?? asDate(legacyNotification.fechaVigencia);
    const nextImageUrl = existing.imageUrl ?? legacyImage.url;
    const nextImagePath = existing.imagePath ?? legacyImage.path;
    const nextPdfUrl = existing.pdfUrl ?? legacyPdf.url;
    const nextPdfPath = existing.pdfPath ?? legacyPdf.path;

    const hasNewData =
      nextCategory !== existing.category ||
      nextCategoryId !== existing.categoryId ||
      nextSentAt?.getTime() !== existing.sentAt?.getTime() ||
      nextValidUntil?.getTime() !== existing.validUntil?.getTime() ||
      nextImageUrl !== existing.imageUrl ||
      nextImagePath !== existing.imagePath ||
      nextPdfUrl !== existing.pdfUrl ||
      nextPdfPath !== existing.pdfPath;

    if (!hasNewData) {
      continue;
    }

    await (prisma as any).notification.update({
      where: { id: existing.id },
      data: {
        category: nextCategory,
        categoryId: nextCategoryId,
        sentAt: nextSentAt,
        validUntil: nextValidUntil,
        imageUrl: nextImageUrl,
        imagePath: nextImagePath,
        pdfUrl: nextPdfUrl,
        pdfPath: nextPdfPath,
      },
    });

    notificationsUpdated += 1;
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        categoriesUpserted: legacyCategories.length,
        notificationsProcessed: legacyNotifications.length,
        notificationsFound,
        notificationsMissing,
        notificationsUpdated,
        sourceFiles: {
          notificationsFile,
          categoriesFile: (await fileExists(categoriesFile)) ? categoriesFile : null,
          dumpFile,
        },
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
