/**
 * Claves y URLs de los archivos guardados en Cloudflare R2 (bucket privado).
 *
 * La base guarda URLs relativas de la app (`/api/archivos/<clave>`). Las sirve
 * `src/app/api/archivos/[...key]/route.ts` redirigiendo a una URL prefirmada de R2, así
 * funcionan igual en local, en previews y en producción (todas comparten la base).
 * Las claves conservan la ruta que tenían en Firebase Storage:
 * `condominiums/<slug>/projects/<proyecto>/<tipo>/<archivo>`.
 *
 * Este módulo no habla con R2 ni lee secretos: lo usan cliente, servidor y scripts.
 */

export const STORED_FILE_URL_PREFIX = "/api/archivos/";

/** Todas las claves que sirve la app viven bajo este prefijo. */
export const STORAGE_ROOT_PREFIX = "condominiums/";

export const CONDO_ASSET_KINDS = [
  "condominium-logo",
  "condominium-image",
  "footer-logo",
  "privacy-pdf",
  "project-document",
  "notification-image",
  "notification-pdf",
  "ticket-response-image",
  "ticket-response-pdf",
  "income-receipt",
  "expense-receipt",
  "announcement-pdf",
  "private-area-document",
  "budget-document",
] as const;

export type CondoAssetKind = (typeof CONDO_ASSET_KINDS)[number];

/** Buckets de Firebase Storage cuyos objetos se copiaron a R2 con la misma clave. */
export const LEGACY_FIREBASE_BUCKETS = ["insulae2-0.firebasestorage.app", "insulae2-0.appspot.com"];

const KEY_SEGMENT = /^[A-Za-z0-9._-]+$/;

export function isValidStorageKey(key: string): boolean {
  if (!key || key.length > 1024) return false;
  return key.split("/").every((segment) => KEY_SEGMENT.test(segment) && segment !== "." && segment !== "..");
}

/** Clave válida y dentro del prefijo que la app expone. */
export function isServableStorageKey(key: string): boolean {
  return key.startsWith(STORAGE_ROOT_PREFIX) && isValidStorageKey(key);
}

export function storedFileUrl(key: string): string {
  return `${STORED_FILE_URL_PREFIX}${key}`;
}

/** Nombre de archivo apto para una clave de R2 (mismo criterio que usaba Firebase). */
export function sanitizeFileName(fileName: string): string {
  const safe = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+/, "")
    .toLowerCase();
  return safe || "archivo";
}

/** Segmento de ruta seguro (slug del condominio, id de proyecto o etiqueta de módulo). */
export function sanitizeKeySegment(value: string): string {
  return sanitizeFileName(value).replace(/\./g, "-") || "general";
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** ¿Es una URL de archivo servida por la app (`/api/archivos/...`, relativa o absoluta)? */
export function isStoredFileUrl(value: string | null | undefined): boolean {
  return storedKeyFromAppUrl(value) !== null;
}

function storedKeyFromAppUrl(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  let pathname: string;
  if (raw.startsWith("/")) {
    // "//host/..." no es relativa: apunta a otro sitio.
    if (raw.startsWith("//")) return null;
    pathname = raw.split(/[?#]/)[0];
  } else {
    // Solo http(s): otros esquemas (javascript:, file:, intent:...) nunca son archivos de la app.
    const url = parseUrl(raw);
    if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) return null;
    pathname = url.pathname;
  }
  if (!pathname.startsWith(STORED_FILE_URL_PREFIX)) return null;
  let key: string;
  try {
    key = decodeURIComponent(pathname.slice(STORED_FILE_URL_PREFIX.length));
  } catch {
    return null;
  }
  return isServableStorageKey(key) ? key : null;
}

/**
 * ¿Se puede usar tal cual? URL absoluta (http/https) o de un archivo de la app
 * (`/api/archivos/...`). Lo demás son nombres de archivo de la 1.0 que necesitan su ruta legacy.
 */
export function isUsableFileUrl(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  return /^https?:\/\//i.test(raw) || isStoredFileUrl(raw);
}

/** Ruta del objeto dentro de una URL de descarga de Firebase Storage de nuestro bucket. */
export function firebaseObjectPath(value: string | null | undefined): string | null {
  const url = parseUrl((value ?? "").trim());
  if (!url) return null;

  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<ruta codificada>?alt=media&token=...
  if (url.hostname === "firebasestorage.googleapis.com") {
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match || !LEGACY_FIREBASE_BUCKETS.includes(decodeURIComponent(match[1]))) return null;
    try {
      return decodeURIComponent(match[2]);
    } catch {
      return null;
    }
  }

  // https://storage.googleapis.com/<bucket>/<ruta>
  if (url.hostname === "storage.googleapis.com") {
    const [, bucket, ...rest] = url.pathname.split("/");
    if (!LEGACY_FIREBASE_BUCKETS.includes(bucket) || rest.length === 0) return null;
    try {
      return decodeURIComponent(rest.join("/"));
    } catch {
      return null;
    }
  }

  return null;
}

export function isFirebaseStorageUrl(value: string | null | undefined): boolean {
  return firebaseObjectPath(value) !== null;
}

/**
 * Clave de R2 de un valor guardado en la base: URL de la app (`/api/archivos/<clave>`),
 * URL de Firebase de nuestro bucket (se copió con la misma clave) o ruta suelta
 * `condominiums/...`. `null` si no es un archivo nuestro (p. ej. nombres legacy de la 1.0).
 * Solo devuelve claves bajo `condominiums/`, las únicas que la app sirve.
 */
export function storageKeyFromUrl(value: string | null | undefined): string | null {
  const fromApp = storedKeyFromAppUrl(value);
  if (fromApp) return fromApp;
  const fromFirebase = firebaseObjectPath(value);
  if (fromFirebase && isServableStorageKey(fromFirebase)) return fromFirebase;
  const raw = (value ?? "").trim();
  return isServableStorageKey(raw) ? raw : null;
}

/** URL absoluta de un archivo de la app, para correos o `fetch` del servidor. */
export function absoluteFileUrl(value: string, origin: string): string {
  return value.startsWith("/") ? `${origin.replace(/\/+$/, "")}${value}` : value;
}

/** Nombre visible de un archivo a partir de su URL o clave (último segmento, sin el prefijo de tiempo). */
export function fileNameFromStoredUrl(value: string | null | undefined): string {
  const key = storageKeyFromUrl(value);
  const last = (key ?? (value ?? "").split(/[?#]/)[0]).split("/").pop() ?? "";
  return last.replace(/^\d{10,}-/, "");
}

/** `Content-Disposition` con el nombre original, codificado para cabeceras HTTP (RFC 6266). */
export function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const fallback = fileName.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "archivo";
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
