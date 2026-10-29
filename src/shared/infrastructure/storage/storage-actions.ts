"use server";

/**
 * Server actions de almacenamiento del panel. El navegador pide aquí una URL prefirmada
 * para subir directo a R2 (sin pasar el archivo por la función de Vercel, que corta a
 * 4.5 MB) y la URL definitiva que se guarda en la base; también borra archivos reemplazados.
 *
 * Subir: personal con permiso de escritura en alguno de los módulos del tipo de archivo.
 * Borrar: solo los tipos que las pantallas borran, con permiso de editar o eliminar en su
 * módulo y cuando ningún registro usa ya el archivo.
 */
import { randomUUID } from "node:crypto";
import { MODULES, type ModuleName } from "@/shared/application/auth/modules";
import { getUserPermissions, hasPermission, readAdminSession, type PermissionAction } from "@/shared/application/auth/permissions";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { deleteObject, presignPutUrl } from "./r2";
import {
  CONDO_ASSET_KINDS,
  STORAGE_ROOT_PREFIX,
  contentDisposition,
  sanitizeFileName,
  sanitizeKeySegment,
  storageKeyFromUrl,
  storedFileUrl,
  type CondoAssetKind,
} from "./storage-paths";

/** Módulos cuyo permiso de escritura autoriza subir cada tipo de archivo. */
const KIND_MODULES: Record<CondoAssetKind, readonly ModuleName[]> = {
  "condominium-logo": [MODULES.CONDOMINIO],
  "condominium-image": [MODULES.CONDOMINIO],
  "footer-logo": [MODULES.CONDOMINIO],
  "privacy-pdf": [MODULES.CONDOMINIO],
  // Reglamentos y constancias fiscales del directorio.
  "project-document": [MODULES.REGLAMENTOS, MODULES.DIRECTORIO],
  "notification-image": [MODULES.NOTIFICACIONES],
  "notification-pdf": [MODULES.NOTIFICACIONES],
  "ticket-response-image": [MODULES.TICKETS],
  "ticket-response-pdf": [MODULES.TICKETS],
  "income-receipt": [MODULES.COBROS, MODULES.OTROS_INGRESOS],
  "expense-receipt": [MODULES.GASTOS],
  "announcement-pdf": [MODULES.CONVOCATORIAS],
  "private-area-document": [MODULES.AREAS_PRIVATIVAS],
  "budget-document": [MODULES.PRESUPUESTO],
};

const WRITE_ACTIONS: readonly PermissionAction[] = ["canCreate", "canUpdate", "canDelete"];
const DELETE_ACTIONS: readonly PermissionAction[] = ["canUpdate", "canDelete"];

/** Formas en que una columna puede referir un objeto: URL de la app o URL antigua de Firebase. */
interface FileReference {
  appUrl: string;
  firebasePath: string;
}

/**
 * Tipos que las pantallas borran (comprobantes de ingresos y gastos, imágenes de áreas
 * privativas): módulos que lo autorizan y si algún registro todavía usa el archivo.
 */
const DELETABLE_KINDS: Partial<
  Record<CondoAssetKind, { modules: readonly ModuleName[]; isReferenced: (ref: FileReference) => Promise<boolean> }>
> = {
  "income-receipt": {
    modules: [MODULES.COBROS, MODULES.OTROS_INGRESOS],
    isReferenced: async ({ appUrl, firebasePath }) =>
      (await prisma.income.count({
        where: { OR: [{ receiptUrl: { endsWith: appUrl } }, { receiptUrl: { contains: firebasePath } }] },
      })) > 0,
  },
  "expense-receipt": {
    modules: [MODULES.GASTOS],
    isReferenced: async ({ appUrl, firebasePath }) =>
      (await prisma.expense.count({
        where: { OR: [{ receiptUrl: { endsWith: appUrl } }, { receiptUrl: { contains: firebasePath } }] },
      })) > 0,
  },
  "private-area-document": {
    modules: [MODULES.AREAS_PRIVATIVAS],
    isReferenced: async ({ appUrl, firebasePath }) =>
      (await prisma.privateAreaImage.count({
        where: { OR: [{ url: { endsWith: appUrl } }, { url: { contains: firebasePath } }] },
      })) > 0,
  },
};

/** Las pantallas limitan a 10-15 MB; aquí solo se frena lo desproporcionado. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  svg: "image/svg+xml",
};

const ALLOWED_TYPES = new Set(Object.values(TYPE_BY_EXTENSION));

/** El SVG puede llevar scripts: se guarda como descarga (dentro de un <img> se ve igual). */
const DOWNLOAD_ONLY_TYPES = new Set(["image/svg+xml"]);

/**
 * Objetos inmutables (cada subida usa una clave nueva). `private`: solo el navegador los
 * guarda, no los cachés intermedios; hay recibos y constancias.
 */
const OBJECT_CACHE_CONTROL = "private, max-age=31536000, immutable";

export type StorageActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; message: string };

export interface UploadTarget {
  /** URL prefirmada (10 min) para hacer PUT del archivo. */
  uploadUrl: string;
  /** Cabeceras firmadas que el navegador debe mandar exactamente así. */
  headers: Record<string, string>;
  key: string;
  /** Valor que se guarda en la base. */
  url: string;
}

async function hasAnyPermission(modules: readonly ModuleName[], actions: readonly PermissionAction[]): Promise<boolean> {
  if (!(await readAdminSession())) return false;
  const permissions = await getUserPermissions();
  return actions.some((action) => hasPermission(permissions, modules, action));
}

function resolveContentType(fileName: string, declared: string): string | null {
  const type = declared.trim().toLowerCase();
  if (ALLOWED_TYPES.has(type)) return type;
  if (type === "image/jpg" || type === "image/pjpeg") return "image/jpeg";
  if (type && type !== "application/octet-stream") return null;
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? null;
}

export async function createUploadTargetAction(input: {
  kind: CondoAssetKind;
  condominiumSlug: string;
  projectId: string;
  fileName: string;
  contentType: string;
  size: number;
}): Promise<StorageActionResult<{ target: UploadTarget }>> {
  if (!CONDO_ASSET_KINDS.includes(input?.kind)) {
    return { ok: false, message: "Tipo de archivo no reconocido." };
  }
  if (!(await hasAnyPermission(KIND_MODULES[input.kind], WRITE_ACTIONS))) {
    return { ok: false, message: "No tienes permiso para subir archivos en este módulo." };
  }
  if (!Number.isInteger(input.size) || input.size <= 0) {
    return { ok: false, message: "El archivo está vacío." };
  }
  if (input.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `El archivo excede el tamaño máximo permitido de ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  }

  const fileName = String(input.fileName ?? "").trim() || "archivo";
  const contentType = resolveContentType(fileName, String(input.contentType ?? ""));
  if (!contentType) {
    return { ok: false, message: "Solo se permiten archivos PDF o imágenes." };
  }

  // El segmento aleatorio hace la URL imposible de adivinar: el archivo se sirve sin sesión
  // (correos, minisitio), igual que los enlaces con token de Firebase.
  const key = [
    STORAGE_ROOT_PREFIX.replace(/\/$/, ""),
    sanitizeKeySegment(input.condominiumSlug),
    "projects",
    sanitizeKeySegment(input.projectId),
    input.kind,
    randomUUID(),
    sanitizeFileName(fileName),
  ].join("/");

  const headers = {
    "Content-Type": contentType,
    "Content-Disposition": contentDisposition(DOWNLOAD_ONLY_TYPES.has(contentType) ? "attachment" : "inline", fileName),
    "Cache-Control": OBJECT_CACHE_CONTROL,
  };

  try {
    const uploadUrl = await presignPutUrl(key, { contentLength: input.size, headers });
    return { ok: true, target: { uploadUrl, headers, key, url: storedFileUrl(key) } };
  } catch (error) {
    console.error("[storage] createUploadTargetAction:", error);
    return { ok: false, message: "No se pudo preparar la subida del archivo." };
  }
}

/**
 * Borra de R2 un archivo que ya se quitó de su registro (URL `/api/archivos/...` o URL antigua
 * de Firebase migrada). Las pantallas lo llaman después de guardar el cambio.
 */
export async function deleteStoredAssetAction(fileUrl: string): Promise<StorageActionResult> {
  const key = storageKeyFromUrl(fileUrl);
  if (!key) {
    return { ok: false, message: "El archivo no pertenece al almacenamiento de la app." };
  }

  const rule = DELETABLE_KINDS[key.split("/")[4] as CondoAssetKind];
  if (!rule || !(await hasAnyPermission(rule.modules, DELETE_ACTIONS))) {
    return { ok: false, message: "No tienes permiso para borrar este archivo." };
  }

  try {
    if (await rule.isReferenced({ appUrl: storedFileUrl(key), firebasePath: `/o/${encodeURIComponent(key)}` })) {
      return { ok: false, message: "El archivo todavía está en uso." };
    }
    await deleteObject(key);
    return { ok: true };
  } catch (error) {
    console.error("[storage] deleteStoredAssetAction:", error);
    return { ok: false, message: "No se pudo borrar el archivo." };
  }
}
