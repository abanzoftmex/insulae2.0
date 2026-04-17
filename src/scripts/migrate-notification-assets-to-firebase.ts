import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from "firebase/storage";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

loadDotenv({ path: path.resolve(process.cwd(), ".env") });

const LEGACY_NOTIFICATION_BASE_URL = "https://sistemasabanza.com/insulae";
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

type AssetKind = "image" | "pdf";

type NotificationAssetRow = {
  id: string;
  legacyId: number | null;
  title: string;
  imageUrl: string | null;
  imagePath: string | null;
  pdfUrl: string | null;
  pdfPath: string | null;
};

type MigrationFailure = {
  notificationId: string;
  legacyId: number | null;
  assetKind: AssetKind;
  sourceRef: string | null;
  message: string;
};

type AssetMigrationResult =
  | {
      status: "skipped_already_firebase" | "skipped_missing_source" | "dry_run_candidate";
      nextUrl: string | null;
      nextPath: string | null;
    }
  | {
      status: "migrated" | "reused_existing";
      nextUrl: string;
      nextPath: string;
    }
  | {
      status: "failed";
      nextUrl: string | null;
      nextPath: string | null;
      failure: MigrationFailure;
    };

type ParsedArgs = {
  dryRun: boolean;
  limit: number | null;
  only: "all" | AssetKind;
};

function trimSafe(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "asset";
}

function parseArgs(argv: string[]): ParsedArgs {
  const dryRun = argv.includes("--dry-run");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const onlyArg = argv.find((arg) => arg.startsWith("--only="));

  const parsedLimit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : Number.NaN;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;

  const onlyValue = (onlyArg?.split("=")[1] ?? "all").toLowerCase();
  const only: ParsedArgs["only"] = onlyValue === "image" || onlyValue === "pdf" ? onlyValue : "all";

  return {
    dryRun,
    limit,
    only,
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }

  return value;
}

function getFirebaseStorageClient(): FirebaseStorage {
  const firebaseConfig: FirebaseOptions = {
    apiKey: getRequiredEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    projectId: getRequiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getRequiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    appId: getRequiredEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
      `${getRequiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")}.firebaseapp.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
  };

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getStorage(app);
}

function isFirebaseAssetUrl(url: string | null | undefined): boolean {
  const normalized = trimSafe(url);
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    const host = parsed.host.toLowerCase();

    if (host.includes("firebasestorage.googleapis.com")) {
      return true;
    }

    if (host === "storage.googleapis.com") {
      return true;
    }

    if (host.endsWith(".firebasestorage.app")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function isLegacyAssetValue(value: string | null | undefined): boolean {
  const normalized = trimSafe(value).toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("sistemasabanza.com/insulae") ||
    normalized.startsWith("imagenes/notificaciones/") ||
    normalized.startsWith("/imagenes/notificaciones/") ||
    normalized.startsWith("notificaciones/")
  );
}

function normalizeLegacySourceUrl(source: string | null | undefined): string | null {
  const normalized = trimSafe(source);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const withoutLeadingSlash = normalized.replace(/^\/+/, "");

  if (withoutLeadingSlash.startsWith("imagenes/notificaciones/")) {
    return `${LEGACY_NOTIFICATION_BASE_URL}/${withoutLeadingSlash}`;
  }

  if (withoutLeadingSlash.startsWith("notificaciones/")) {
    return `${LEGACY_NOTIFICATION_BASE_URL}/imagenes/${withoutLeadingSlash}`;
  }

  return `${LEGACY_NOTIFICATION_BASE_URL}/imagenes/notificaciones/${withoutLeadingSlash}`;
}

function decodeFirebasePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.host.toLowerCase();

    if (host.includes("firebasestorage.googleapis.com")) {
      const marker = "/o/";
      const index = parsed.pathname.indexOf(marker);
      if (index >= 0) {
        const encodedPath = parsed.pathname.slice(index + marker.length);
        return decodeURIComponent(encodedPath);
      }
    }

    if (host === "storage.googleapis.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return parts.slice(1).join("/");
      }
    }

    return null;
  } catch {
    return null;
  }
}

function inferFileNameFromSource(sourceRef: string, kind: AssetKind): string {
  const fallbackName = kind === "image" ? "notification-image" : "notification-pdf";

  try {
    const parsed = new URL(sourceRef);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop() ?? fallbackName;
    return sanitizeFileName(lastSegment);
  } catch {
    const lastSegment = sourceRef.split("/").filter(Boolean).pop() ?? fallbackName;
    return sanitizeFileName(lastSegment);
  }
}

function ensureExtension(fileName: string, mimeType: string | null, kind: AssetKind): string {
  if (fileName.includes(".")) {
    return fileName;
  }

  const byMime = (() => {
    const normalized = trimSafe(mimeType).toLowerCase();
    if (normalized === "application/pdf") {
      return "pdf";
    }

    if (normalized === "image/png") {
      return "png";
    }

    if (normalized === "image/webp") {
      return "webp";
    }

    if (normalized === "image/gif") {
      return "gif";
    }

    if (normalized === "image/jpeg" || normalized === "image/jpg") {
      return "jpg";
    }

    return kind === "pdf" ? "pdf" : "jpg";
  })();

  return `${fileName}.${byMime}`;
}

function buildTargetPath(input: {
  condominiumSlug: string;
  notificationId: string;
  sourceRef: string;
  kind: AssetKind;
  mimeType: string | null;
}): string {
  const folderKind = input.kind === "image" ? "notification-image" : "notification-pdf";
  const fileName = ensureExtension(inferFileNameFromSource(input.sourceRef, input.kind), input.mimeType, input.kind);
  const fingerprint = createHash("sha1").update(input.sourceRef).digest("hex").slice(0, 16);

  return [
    "condominiums",
    input.condominiumSlug,
    "projects",
    "notificaciones",
    folderKind,
    "migrated",
    input.notificationId,
    `${fingerprint}-${fileName}`,
  ].join("/");
}

async function fetchBinary(sourceUrl: string): Promise<{ bytes: Uint8Array; mimeType: string | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al descargar ${sourceUrl}`);
    }

    const buffer = await response.arrayBuffer();
    const mimeType = response.headers.get("content-type");

    return {
      bytes: new Uint8Array(buffer),
      mimeType,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function migrateAsset(input: {
  storage: FirebaseStorage;
  dryRun: boolean;
  condominiumSlug: string;
  notification: NotificationAssetRow;
  kind: AssetKind;
}): Promise<AssetMigrationResult> {
  const currentUrl = input.kind === "image" ? input.notification.imageUrl : input.notification.pdfUrl;
  const currentPath = input.kind === "image" ? input.notification.imagePath : input.notification.pdfPath;

  if (isFirebaseAssetUrl(currentUrl)) {
    const decodedPath = decodeFirebasePathFromUrl(trimSafe(currentUrl));
    return {
      status: "skipped_already_firebase",
      nextUrl: trimSafe(currentUrl),
      nextPath: trimSafe(currentPath) || decodedPath,
    };
  }

  const sourceRefRaw = trimSafe(currentUrl) || trimSafe(currentPath);
  if (!sourceRefRaw) {
    return {
      status: "skipped_missing_source",
      nextUrl: null,
      nextPath: null,
    };
  }

  const sourceUrl = normalizeLegacySourceUrl(sourceRefRaw);
  if (!sourceUrl || !isLegacyAssetValue(sourceRefRaw)) {
    return {
      status: "skipped_missing_source",
      nextUrl: trimSafe(currentUrl) || null,
      nextPath: trimSafe(currentPath) || null,
    };
  }

  if (input.dryRun) {
    const dryRunPath = buildTargetPath({
      condominiumSlug: input.condominiumSlug,
      notificationId: input.notification.id,
      sourceRef: sourceUrl,
      kind: input.kind,
      mimeType: null,
    });

    return {
      status: "dry_run_candidate",
      nextUrl: null,
      nextPath: dryRunPath,
    };
  }

  try {
    const firstPathGuess = buildTargetPath({
      condominiumSlug: input.condominiumSlug,
      notificationId: input.notification.id,
      sourceRef: sourceUrl,
      kind: input.kind,
      mimeType: null,
    });
    const objectRef = ref(input.storage, firstPathGuess);

    try {
      const existingUrl = await getDownloadURL(objectRef);
      return {
        status: "reused_existing",
        nextUrl: existingUrl,
        nextPath: firstPathGuess,
      };
    } catch {
      // If object does not exist yet, continue with upload.
    }

    const binary = await fetchBinary(sourceUrl);
    const finalPath = buildTargetPath({
      condominiumSlug: input.condominiumSlug,
      notificationId: input.notification.id,
      sourceRef: sourceUrl,
      kind: input.kind,
      mimeType: binary.mimeType,
    });
    const finalRef = ref(input.storage, finalPath);

    await uploadBytes(finalRef, binary.bytes, {
      contentType: binary.mimeType || undefined,
    });

    const migratedUrl = await getDownloadURL(finalRef);

    return {
      status: "migrated",
      nextUrl: migratedUrl,
      nextPath: finalPath,
    };
  } catch (error) {
    return {
      status: "failed",
      nextUrl: trimSafe(currentUrl) || null,
      nextPath: trimSafe(currentPath) || null,
      failure: {
        notificationId: input.notification.id,
        legacyId: input.notification.legacyId,
        assetKind: input.kind,
        sourceRef: sourceUrl,
        message: error instanceof Error ? error.message : "Error desconocido",
      },
    };
  }
}

function isLegacyUrl(value: string | null | undefined): boolean {
  const normalized = trimSafe(value);
  return normalized.length > 0 && isLegacyAssetValue(normalized) && !isFirebaseAssetUrl(normalized);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
      },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
      },
    }));

  if (!condominium) {
    throw new Error("No se encontro un condominio activo para migrar assets de notificaciones.");
  }

  const notifications = (await (prisma as any).notification.findMany({
    where: {
      condominiumId: condominium.id,
      OR: [{ imageUrl: { not: null } }, { imagePath: { not: null } }, { pdfUrl: { not: null } }, { pdfPath: { not: null } }],
    },
    select: {
      id: true,
      legacyId: true,
      title: true,
      imageUrl: true,
      imagePath: true,
      pdfUrl: true,
      pdfPath: true,
    },
    orderBy: [{ legacyId: "asc" }, { id: "asc" }],
    take: args.limit ?? undefined,
  })) as NotificationAssetRow[];

  const storage = args.dryRun ? null : getFirebaseStorageClient();

  const failures: MigrationFailure[] = [];

  const counters = {
    totalNotifications: notifications.length,
    notificationsUpdated: 0,
    assetsScanned: 0,
    migrated: 0,
    reusedExisting: 0,
    skippedAlreadyFirebase: 0,
    skippedMissingSource: 0,
    dryRunCandidates: 0,
    failed: 0,
  };

  for (const notification of notifications) {
    const updateData: Record<string, unknown> = {};

    const processImage = args.only === "all" || args.only === "image";
    const processPdf = args.only === "all" || args.only === "pdf";

    if (processImage) {
      counters.assetsScanned += 1;

      const result = await migrateAsset({
        storage: storage as FirebaseStorage,
        dryRun: args.dryRun,
        condominiumSlug: condominium.slug,
        notification,
        kind: "image",
      });

      if (result.status === "migrated") {
        counters.migrated += 1;
        updateData.imageUrl = result.nextUrl;
        updateData.imagePath = result.nextPath;
      } else if (result.status === "reused_existing") {
        counters.reusedExisting += 1;
        if (trimSafe(notification.imageUrl) !== result.nextUrl || trimSafe(notification.imagePath) !== result.nextPath) {
          updateData.imageUrl = result.nextUrl;
          updateData.imagePath = result.nextPath;
        }
      } else if (result.status === "skipped_already_firebase") {
        counters.skippedAlreadyFirebase += 1;
        if (result.nextPath && trimSafe(notification.imagePath) !== result.nextPath) {
          updateData.imagePath = result.nextPath;
        }
      } else if (result.status === "skipped_missing_source") {
        counters.skippedMissingSource += 1;
      } else if (result.status === "dry_run_candidate") {
        counters.dryRunCandidates += 1;
      } else if (result.status === "failed") {
        counters.failed += 1;
        failures.push(result.failure);
        console.error("[migrate-notification-assets] image migration failed", result.failure);
      }
    }

    if (processPdf) {
      counters.assetsScanned += 1;

      const result = await migrateAsset({
        storage: storage as FirebaseStorage,
        dryRun: args.dryRun,
        condominiumSlug: condominium.slug,
        notification,
        kind: "pdf",
      });

      if (result.status === "migrated") {
        counters.migrated += 1;
        updateData.pdfUrl = result.nextUrl;
        updateData.pdfPath = result.nextPath;
      } else if (result.status === "reused_existing") {
        counters.reusedExisting += 1;
        if (trimSafe(notification.pdfUrl) !== result.nextUrl || trimSafe(notification.pdfPath) !== result.nextPath) {
          updateData.pdfUrl = result.nextUrl;
          updateData.pdfPath = result.nextPath;
        }
      } else if (result.status === "skipped_already_firebase") {
        counters.skippedAlreadyFirebase += 1;
        if (result.nextPath && trimSafe(notification.pdfPath) !== result.nextPath) {
          updateData.pdfPath = result.nextPath;
        }
      } else if (result.status === "skipped_missing_source") {
        counters.skippedMissingSource += 1;
      } else if (result.status === "dry_run_candidate") {
        counters.dryRunCandidates += 1;
      } else if (result.status === "failed") {
        counters.failed += 1;
        failures.push(result.failure);
        console.error("[migrate-notification-assets] pdf migration failed", result.failure);
      }
    }

    if (!args.dryRun && Object.keys(updateData).length > 0) {
      await (prisma as any).notification.update({
        where: { id: notification.id },
        data: updateData,
      });
      counters.notificationsUpdated += 1;
    }
  }

  const consistencyRows = (await (prisma as any).notification.findMany({
    where: {
      condominiumId: condominium.id,
      OR: [{ imageUrl: { not: null } }, { pdfUrl: { not: null } }],
    },
    select: {
      id: true,
      legacyId: true,
      imageUrl: true,
      imagePath: true,
      pdfUrl: true,
      pdfPath: true,
    },
  })) as Array<{
    id: string;
    legacyId: number | null;
    imageUrl: string | null;
    imagePath: string | null;
    pdfUrl: string | null;
    pdfPath: string | null;
  }>;

  const consistency = {
    imageUrlsTotal: consistencyRows.filter((row) => trimSafe(row.imageUrl).length > 0).length,
    imageUrlsFirebase: consistencyRows.filter((row) => isFirebaseAssetUrl(row.imageUrl)).length,
    imageUrlsLegacyRemaining: consistencyRows.filter((row) => isLegacyUrl(row.imageUrl)).length,
    imagePathMissingForFirebaseUrl: consistencyRows.filter(
      (row) => isFirebaseAssetUrl(row.imageUrl) && trimSafe(row.imagePath).length === 0,
    ).length,
    pdfUrlsTotal: consistencyRows.filter((row) => trimSafe(row.pdfUrl).length > 0).length,
    pdfUrlsFirebase: consistencyRows.filter((row) => isFirebaseAssetUrl(row.pdfUrl)).length,
    pdfUrlsLegacyRemaining: consistencyRows.filter((row) => isLegacyUrl(row.pdfUrl)).length,
    pdfPathMissingForFirebaseUrl: consistencyRows.filter(
      (row) => isFirebaseAssetUrl(row.pdfUrl) && trimSafe(row.pdfPath).length === 0,
    ).length,
    legacySamples: consistencyRows
      .filter((row) => isLegacyUrl(row.imageUrl) || isLegacyUrl(row.pdfUrl))
      .slice(0, 20)
      .map((row) => ({
        id: row.id,
        legacyId: row.legacyId,
        imageUrl: row.imageUrl,
        pdfUrl: row.pdfUrl,
      })),
  };

  let failureLogFile: string | null = null;

  if (failures.length > 0) {
    const outputDir = path.resolve(process.cwd(), "data/migration-logs");
    await mkdir(outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    failureLogFile = path.join(outputDir, `notification-assets-migration-failures-${timestamp}.json`);
    await writeFile(failureLogFile, JSON.stringify(failures, null, 2), "utf8");
  }

  console.log(
    JSON.stringify(
      {
        condominiumSlug: condominium.slug,
        mode: args.dryRun ? "dry-run" : "apply",
        only: args.only,
        limit: args.limit,
        counters,
        consistency,
        failureLogFile,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[migrate-notification-assets] fatal error", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
