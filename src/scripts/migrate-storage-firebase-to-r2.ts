/**
 * Migra los archivos de Firebase Storage a Cloudflare R2 y reescribe sus URLs en la base.
 *
 *   npm run storage:migrate-to-r2                           simulación: no escribe nada
 *   npm run storage:migrate-to-r2 -- --copy                 copia a R2 lo que falte; no toca la base
 *   npm run storage:migrate-to-r2 -- --apply --app-url https://<producción>
 *                                                           copia y reescribe las URLs (guarda respaldo)
 *   npm run storage:migrate-to-r2 -- --rollback <respaldo>  deshace una reescritura
 *
 * Opciones: --service-account <cuenta.json> (o FIREBASE_SERVICE_ACCOUNT_PATH), --bucket <bucket>
 * (insulae2-0.firebasestorage.app), --backup-dir <dir> (.storage-migration).
 *
 * Idempotente: copia solo objetos ausentes o distintos (MD5) y solo reescribe valores que
 * siguen apuntando a Firebase. Cada copia se verifica con Content-MD5 y una URL solo se
 * reescribe si su objeto ya está en R2 con el mismo MD5. La clave en R2 es la misma ruta
 * que tenía el objeto en Firebase, así que las rutas sueltas (`imagePath`, `pdfPath`) no cambian.
 *
 * Las URLs nuevas (`/api/archivos/<clave>`) solo funcionan con el código que incluye esa
 * ruta: correr `--apply` DESPUÉS de desplegarlo. Antes de escribir, `--apply` comprueba que
 * `--app-url` ya sirve un archivo desde R2 (`--skip-app-check` lo omite).
 */
import { createHash, createSign } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import type { PrismaClient } from "@prisma/client";
import { headObject, listObjects, putObject } from "@/shared/infrastructure/storage/r2";
import {
  STORAGE_ROOT_PREFIX,
  firebaseObjectPath,
  isFirebaseStorageUrl,
  isValidStorageKey,
  storedFileUrl,
} from "@/shared/infrastructure/storage/storage-paths";

// Antes de importar Prisma, que exige DATABASE_URL al cargarse.
config({ path: [".env.local", ".env"], quiet: true });

let prisma: PrismaClient;

const DEFAULT_BUCKET = "insulae2-0.firebasestorage.app";
const DEFAULT_BACKUP_DIR = ".storage-migration";
const OBJECT_CACHE_CONTROL = "private, max-age=31536000, immutable";

/** Columnas que guardan la URL completa de un archivo. Tablas = modelos de Prisma (sin @@map). */
const URL_COLUMNS: ReadonlyArray<{ table: string; column: string }> = [
  { table: "Project", column: "condominiumLogoUrl" },
  { table: "Project", column: "condominiumImageUrl" },
  { table: "Project", column: "footerLogoUrl" },
  { table: "Project", column: "privacyNoticePdfUrl" },
  { table: "ProjectDocument", column: "storagePath" },
  { table: "Notification", column: "imageUrl" },
  { table: "Notification", column: "pdfUrl" },
  { table: "Ticket", column: "requestImageUrl" },
  { table: "Ticket", column: "requestPdfUrl" },
  { table: "Ticket", column: "responseImageUrl" },
  { table: "Ticket", column: "responsePdfUrl" },
  { table: "Income", column: "receiptUrl" },
  { table: "Expense", column: "receiptUrl" },
  { table: "Announcement", column: "pdfUrl" },
  { table: "User", column: "taxStatusPdfUrl" },
  { table: "PrivateAreaImage", column: "url" },
  { table: "BudgetLine", column: "supplierUrl" },
];

/** Etiqueta de `ProjectDocument.storageBucket` para los documentos que ya viven en R2. */
const R2_BUCKET_LABEL = "r2";

interface Args {
  mode: "dry-run" | "copy" | "apply" | "rollback";
  rollbackFile: string | null;
  appUrl: string | null;
  skipAppCheck: boolean;
  serviceAccountPath: string | null;
  bucket: string;
  backupDir: string;
}

function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? (argv[index + 1] ?? null) : null;
  };
  const rollbackFile = value("--rollback");
  const mode = rollbackFile ? "rollback" : argv.includes("--apply") ? "apply" : argv.includes("--copy") ? "copy" : "dry-run";
  return {
    mode,
    rollbackFile,
    appUrl: value("--app-url"),
    skipAppCheck: argv.includes("--skip-app-check"),
    serviceAccountPath:
      value("--service-account") || process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() || process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || null,
    bucket: value("--bucket") || DEFAULT_BUCKET,
    backupDir: value("--backup-dir") || DEFAULT_BACKUP_DIR,
  };
}

// ---------------------------------------------------------------------------------------
// Google Cloud Storage (solo lectura) con la cuenta de servicio de Firebase

interface GcsObject {
  name: string;
  size: number;
  contentType: string | null;
  contentDisposition: string | null;
  /** MD5 en hexadecimal (GCS lo da en base64). */
  md5Hex: string;
  updated: string;
}

async function gcsAccessToken(serviceAccountPath: string): Promise<string> {
  const account = JSON.parse(readFileSync(serviceAccountPath, "utf8")) as { client_email: string; private_key: string; token_uri: string };
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/devstorage.read_only",
    aud: account.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key).toString("base64url");

  const response = await fetch(account.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!response.ok) throw new Error(`Google OAuth: HTTP ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

async function listGcsObjects(bucket: string, token: string): Promise<GcsObject[]> {
  const objects: GcsObject[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o`);
    url.searchParams.set("maxResults", "1000");
    url.searchParams.set("fields", "items(name,size,contentType,contentDisposition,md5Hash,updated),nextPageToken");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`GCS list: HTTP ${response.status} ${await response.text()}`);
    const body = (await response.json()) as {
      items?: Array<{ name: string; size: string; contentType?: string; contentDisposition?: string; md5Hash: string; updated: string }>;
      nextPageToken?: string;
    };
    for (const item of body.items ?? []) {
      objects.push({
        name: item.name,
        size: Number(item.size),
        contentType: item.contentType ?? null,
        contentDisposition: item.contentDisposition ?? null,
        md5Hex: Buffer.from(item.md5Hash, "base64").toString("hex"),
        updated: item.updated,
      });
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return objects;
}

async function downloadGcsObject(bucket: string, name: string, token: string): Promise<Buffer> {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}?alt=media`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GCS GET ${name}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// ---------------------------------------------------------------------------------------
// Copia Firebase -> R2

interface CopyReport {
  total: number;
  alreadyInR2: number;
  copied: number;
  pending: number;
  failed: Array<{ name: string; error: string }>;
  skippedInvalidKey: string[];
}

async function copyObjects(
  args: Args,
  write: boolean,
): Promise<{ report: CopyReport; r2Md5ByKey: Map<string, string>; firebaseKeys: Set<string> }> {
  if (!args.serviceAccountPath) {
    throw new Error("Falta la cuenta de servicio de Firebase: --service-account <ruta.json> o FIREBASE_SERVICE_ACCOUNT_PATH.");
  }
  const token = await gcsAccessToken(args.serviceAccountPath);
  const gcsObjects = await listGcsObjects(args.bucket, token);
  const r2Md5ByKey = new Map((await listObjects(STORAGE_ROOT_PREFIX)).map((o) => [o.key, o.etag ?? ""]));

  const report: CopyReport = { total: gcsObjects.length, alreadyInR2: 0, copied: 0, pending: 0, failed: [], skippedInvalidKey: [] };
  for (const object of gcsObjects) {
    if (!object.name.startsWith(STORAGE_ROOT_PREFIX) || !isValidStorageKey(object.name)) {
      report.skippedInvalidKey.push(object.name);
      continue;
    }
    if (r2Md5ByKey.get(object.name) === object.md5Hex) {
      report.alreadyInR2 += 1;
      continue;
    }
    if (!write) {
      report.pending += 1;
      continue;
    }

    try {
      const body = await downloadGcsObject(args.bucket, object.name, token);
      const md5 = createHash("md5").update(body).digest();
      if (md5.toString("hex") !== object.md5Hex) throw new Error("el MD5 descargado no coincide con el de Firebase");

      const { etag } = await putObject(object.name, body, {
        contentType: object.contentType || "application/octet-stream",
        contentDisposition: object.contentDisposition ?? undefined,
        cacheControl: OBJECT_CACHE_CONTROL,
        md5Base64: md5.toString("base64"),
        metadata: { origen: "firebase", "firebase-bucket": args.bucket, "firebase-updated": object.updated },
      });
      const stored = etag ?? (await headObject(object.name))?.etag ?? "";
      if (stored !== object.md5Hex) throw new Error(`R2 guardó otro contenido (ETag ${stored})`);

      r2Md5ByKey.set(object.name, stored);
      report.copied += 1;
      console.log(`  copiado  ${object.name} (${(object.size / 1024).toFixed(0)} KB)`);
    } catch (error) {
      // Lo que haya en R2 con esta clave no coincide con Firebase: no cuenta como disponible.
      r2Md5ByKey.delete(object.name);
      report.failed.push({ name: object.name, error: error instanceof Error ? error.message : String(error) });
      console.error(`  ERROR    ${object.name}: ${error instanceof Error ? error.message : error}`);
    }
  }
  return { report, r2Md5ByKey, firebaseKeys: new Set(gcsObjects.map((o) => o.name)) };
}

// ---------------------------------------------------------------------------------------
// Reescritura de URLs en la base

interface Change {
  table: string;
  column: string;
  id: string;
  from: string;
  to: string;
  /** Además del valor, `ProjectDocument.storageBucket` pasa de `from` a `to`. */
  bucketLabel?: { from: string; to: string };
}

interface Unresolved {
  table: string;
  column: string;
  id: string;
  reason: string;
  objectPath: string | null;
}

function quoteIdent(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) throw new Error(`Identificador inválido: ${identifier}`);
  return `"${identifier}"`;
}

/**
 * `available`: claves que estarán en R2 al reescribir (en simulación, también las que se
 * copiarían). `firebaseKeys` solo sirve para explicar por qué falta un objeto.
 */
async function planChanges(
  available: Set<string>,
  firebaseKeys: Set<string>,
): Promise<{ changes: Change[]; unresolved: Unresolved[] }> {
  const changes: Change[] = [];
  const unresolved: Unresolved[] = [];

  for (const { table, column } of URL_COLUMNS) {
    const withBucket = table === "ProjectDocument";
    // ProjectDocument también admite la ruta suelta del objeto con el bucket de Firebase.
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; value: string; bucket?: string }>>(
      `SELECT "id", ${quoteIdent(column)} AS "value"${withBucket ? `, "storageBucket" AS "bucket"` : ""}
         FROM ${quoteIdent(table)}
        WHERE ${quoteIdent(column)} LIKE '%googleapis.com%'${
          withBucket ? ` OR (${quoteIdent(column)} LIKE '${STORAGE_ROOT_PREFIX}%' AND "storageBucket" <> '${R2_BUCKET_LABEL}')` : ""
        }`,
    );

    for (const row of rows) {
      const isBarePath = withBucket && row.value.startsWith(STORAGE_ROOT_PREFIX);
      if (!isBarePath && !isFirebaseStorageUrl(row.value)) {
        unresolved.push({ table, column, id: row.id, reason: "URL de Google no reconocida (otro bucket o formato)", objectPath: null });
        continue;
      }
      const objectPath = isBarePath ? row.value : firebaseObjectPath(row.value)!;
      if (!isValidStorageKey(objectPath)) {
        unresolved.push({ table, column, id: row.id, reason: "ruta con caracteres no válidos para R2", objectPath });
        continue;
      }
      if (!available.has(objectPath)) {
        const reason = firebaseKeys.has(objectPath) ? "la copia a R2 falló" : "el objeto ya no existe en Firebase";
        unresolved.push({ table, column, id: row.id, reason, objectPath });
        continue;
      }
      changes.push({
        table,
        column,
        id: row.id,
        from: row.value,
        to: storedFileUrl(objectPath),
        ...(withBucket && row.bucket !== R2_BUCKET_LABEL ? { bucketLabel: { from: row.bucket ?? "", to: R2_BUCKET_LABEL } } : {}),
      });
    }
  }
  return { changes, unresolved };
}

/** Columnas de texto fuera del catálogo que mencionan Firebase Storage (no se reescriben). */
async function findUncatalogedReferences(): Promise<Array<{ table: string; column: string; rows: number }>> {
  const columns = await prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string }>>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text', 'character varying', 'character', 'json', 'jsonb')`,
  );
  // storageBucket se actualiza junto con storagePath (etiqueta del bucket, no una URL).
  const cataloged = new Set([...URL_COLUMNS.map((c) => `${c.table}.${c.column}`), "ProjectDocument.storageBucket"]);
  const found: Array<{ table: string; column: string; rows: number }> = [];
  for (const { table_name, column_name } of columns) {
    if (cataloged.has(`${table_name}.${column_name}`)) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table_name) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column_name)) continue;
    const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) AS count FROM ${quoteIdent(table_name)}
        WHERE ${quoteIdent(column_name)}::text LIKE '%firebasestorage%'
           OR ${quoteIdent(column_name)}::text LIKE '%storage.googleapis.com%'`,
    );
    if (Number(count) > 0) found.push({ table: table_name, column: column_name, rows: Number(count) });
  }
  return found;
}

/**
 * ¿La app desplegada ya sirve `/api/archivos` desde R2? Devuelve el problema, o `null` si
 * `GET <app>/api/archivos/<clave>` redirige a R2 y R2 entrega el archivo.
 */
async function checkAppServesR2(appUrl: string, storedUrl: string): Promise<string | null> {
  const target = new URL(storedUrl, appUrl);
  try {
    const res = await fetch(target, { redirect: "manual" });
    const location = res.headers.get("location");
    if (res.status !== 302 || !location || !new URL(location, target).hostname.endsWith(".r2.cloudflarestorage.com")) {
      return `${target.href} respondió ${res.status}${location ? ` hacia ${new URL(location, target).host}` : ""}, no una redirección a R2`;
    }
    const file = await fetch(location, { headers: { Range: "bytes=0-0" } });
    await file.arrayBuffer();
    return file.status === 200 || file.status === 206 ? null : `R2 respondió ${file.status} a la URL firmada por la app`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function applyChanges(changes: Change[]): Promise<number> {
  let updated = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const change of changes) {
        const setBucket = change.bucketLabel ? `, "storageBucket" = $4` : "";
        const params = change.bucketLabel ? [change.to, change.id, change.from, change.bucketLabel.to] : [change.to, change.id, change.from];
        const count = await tx.$executeRawUnsafe(
          `UPDATE ${quoteIdent(change.table)} SET ${quoteIdent(change.column)} = $1${setBucket}
            WHERE "id" = $2 AND ${quoteIdent(change.column)} = $3`,
          ...params,
        );
        if (count !== 1) throw new Error(`${change.table}.${change.column} ${change.id}: el valor cambió desde la simulación; no se aplicó nada`);
        updated += count;
      }
    },
    { timeout: 120_000 },
  );
  return updated;
}

async function rollback(file: string): Promise<void> {
  const backup = JSON.parse(readFileSync(file, "utf8")) as { changes: Change[] };
  let restored = 0;
  let skipped = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const change of backup.changes) {
        const setBucket = change.bucketLabel ? `, "storageBucket" = $4` : "";
        const params = change.bucketLabel ? [change.from, change.id, change.to, change.bucketLabel.from] : [change.from, change.id, change.to];
        const count = await tx.$executeRawUnsafe(
          `UPDATE ${quoteIdent(change.table)} SET ${quoteIdent(change.column)} = $1${setBucket}
            WHERE "id" = $2 AND ${quoteIdent(change.column)} = $3`,
          ...params,
        );
        if (count === 1) restored += 1;
        else skipped += 1;
      }
    },
    { timeout: 120_000 },
  );
  console.log(`Restaurados: ${restored}. Omitidos (ya no tenían el valor migrado): ${skipped}.`);
}

// ---------------------------------------------------------------------------------------

async function main() {
  prisma = (await import("@/shared/infrastructure/db/prisma")).prisma;
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === "rollback") {
    await rollback(args.rollbackFile!);
    return;
  }

  console.log(`Modo: ${args.mode}. Bucket de Firebase: ${args.bucket}.`);
  console.log("\n1) Archivos Firebase -> R2");
  const { report, r2Md5ByKey, firebaseKeys } = await copyObjects(args, args.mode !== "dry-run");
  console.log(
    `   En Firebase: ${report.total}. Ya en R2: ${report.alreadyInR2}. Copiados: ${report.copied}. ` +
      `Por copiar: ${report.pending}. Fallidos: ${report.failed.length}.`,
  );
  if (report.skippedInvalidKey.length) console.log("   Omitidos por ruta no válida:", report.skippedInvalidKey);

  console.log("\n2) URLs en la base");
  const available = new Set(r2Md5ByKey.keys());
  if (args.mode === "dry-run") for (const key of firebaseKeys) if (isValidStorageKey(key)) available.add(key);
  const { changes, unresolved } = await planChanges(available, firebaseKeys);
  const byColumn = new Map<string, number>();
  for (const change of changes) byColumn.set(`${change.table}.${change.column}`, (byColumn.get(`${change.table}.${change.column}`) ?? 0) + 1);
  for (const [column, count] of byColumn) console.log(`   ${column}: ${count}`);
  console.log(`   Total a reescribir: ${changes.length}.`);
  for (const item of unresolved) {
    console.log(`   SIN CAMBIO ${item.table}.${item.column} ${item.id}: ${item.reason}${item.objectPath ? ` (${item.objectPath})` : ""}`);
  }
  const uncataloged = await findUncatalogedReferences();
  for (const item of uncataloged) console.log(`   AVISO: ${item.table}.${item.column} menciona Firebase en ${item.rows} filas y no está en el catálogo.`);

  if (args.mode !== "apply") {
    console.log(args.mode === "dry-run" ? "\nSimulación: no se escribió nada." : "\nCopia hecha; la base no se tocó.");
    return;
  }
  if (report.failed.length > 0) {
    console.log("\nHubo copias fallidas: las URLs de esos objetos no se reescriben (quedan en 'SIN CAMBIO').");
  }
  if (changes.length === 0) {
    console.log("\nNada que reescribir.");
    return;
  }

  if (!args.skipAppCheck) {
    if (!args.appUrl) {
      console.log("\nFalta --app-url <https://dominio-de-producción>: se comprueba que ya sirve /api/archivos antes de tocar la base.");
      process.exitCode = 1;
      return;
    }
    const problem = await checkAppServesR2(args.appUrl, changes[0].to);
    if (problem) {
      console.log(`\nLa app todavía no sirve los archivos desde R2 (${problem}). No se tocó la base.`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n${args.appUrl} ya sirve /api/archivos desde R2.`);
  }

  mkdirSync(args.backupDir, { recursive: true });
  const backupFile = path.join(args.backupDir, `urls-firebase-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupFile, JSON.stringify({ generatedAt: new Date().toISOString(), bucket: args.bucket, changes }, null, 2));
  console.log(`\nRespaldo: ${backupFile}`);

  const updated = await applyChanges(changes);
  console.log(`Reescritas: ${updated}. Para deshacer: npm run storage:migrate-to-r2 -- --rollback ${backupFile}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
