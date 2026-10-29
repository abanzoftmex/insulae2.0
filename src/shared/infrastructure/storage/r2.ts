/**
 * Cliente de Cloudflare R2 (API compatible con S3) para el servidor: firmar URLs, subir,
 * leer, borrar y listar objetos.
 *
 * Solo debe importarse desde código de servidor (route handlers, server actions, scripts):
 * usa las credenciales `R2_*`, que nunca llegan al navegador. El navegador sube y descarga
 * con URLs prefirmadas de corta duración.
 */
import { AwsClient } from "aws4fetch";
import { isValidStorageKey } from "./storage-paths";

interface R2Context {
  endpoint: string;
  bucket: string;
  client: AwsClient;
}

let context: R2Context | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} (Cloudflare R2).`);
  }
  return value;
}

function getR2(): R2Context {
  if (context) return context;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : requiredEnv("R2_ENDPOINT"));

  context = {
    endpoint: endpoint.replace(/\/+$/, ""),
    bucket: requiredEnv("R2_BUCKET"),
    client: new AwsClient({
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
      service: "s3",
      region: "auto",
    }),
  };
  return context;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_BUCKET?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      (process.env.R2_ENDPOINT?.trim() || process.env.R2_ACCOUNT_ID?.trim()),
  );
}

function bucketUrl(): URL {
  const { endpoint, bucket } = getR2();
  return new URL(`${endpoint}/${bucket}`);
}

function objectUrl(key: string): URL {
  if (!isValidStorageKey(key)) {
    throw new Error(`Clave de almacenamiento inválida: ${key}`);
  }
  const { endpoint, bucket } = getR2();
  return new URL(`${endpoint}/${bucket}/${key}`);
}

async function r2Error(action: string, key: string, response: Response): Promise<Error> {
  const body = await response.text().catch(() => "");
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
  return new Error(`R2 ${action} ${key}: HTTP ${response.status}${code ? ` (${code})` : ""}`);
}

/**
 * URL prefirmada para que el navegador suba un objeto con PUT. Tipo y tamaño quedan
 * firmados (`allHeaders`): R2 rechaza la subida si el navegador manda otros, igual que
 * cualquier otra cabecera de `headers`, que el cliente debe enviar tal cual.
 */
export async function presignPutUrl(
  key: string,
  options: { contentLength: number; headers: Record<string, string>; expiresInSeconds?: number },
): Promise<string> {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(options.expiresInSeconds ?? 600));
  const signed = await getR2().client.sign(
    new Request(url, {
      method: "PUT",
      headers: { ...options.headers, "Content-Length": String(options.contentLength) },
    }),
    { aws: { signQuery: true, allHeaders: true } },
  );
  return signed.url;
}

/** URL prefirmada de lectura. `contentDisposition` fuerza descarga o nombre de archivo. */
export async function presignGetUrl(
  key: string,
  options: { expiresInSeconds?: number; contentDisposition?: string } = {},
): Promise<string> {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(options.expiresInSeconds ?? 3600));
  if (options.contentDisposition) {
    url.searchParams.set("response-content-disposition", options.contentDisposition);
  }
  const signed = await getR2().client.sign(new Request(url), { aws: { signQuery: true } });
  return signed.url;
}

export interface PutObjectOptions {
  contentType: string;
  contentDisposition?: string;
  cacheControl?: string;
  /** MD5 del contenido en base64: R2 rechaza la subida si no coincide. */
  md5Base64?: string;
  metadata?: Record<string, string>;
}

export async function putObject(key: string, body: Uint8Array | ArrayBuffer, options: PutObjectOptions): Promise<{ etag: string | null }> {
  const headers: Record<string, string> = { "Content-Type": options.contentType };
  if (options.contentDisposition) headers["Content-Disposition"] = options.contentDisposition;
  if (options.cacheControl) headers["Cache-Control"] = options.cacheControl;
  if (options.md5Base64) headers["Content-MD5"] = options.md5Base64;
  for (const [name, value] of Object.entries(options.metadata ?? {})) {
    headers[`x-amz-meta-${name}`] = value;
  }

  const response = await getR2().client.fetch(objectUrl(key), { method: "PUT", body: body as BodyInit, headers });
  if (!response.ok) throw await r2Error("PUT", key, response);
  return { etag: response.headers.get("etag")?.replace(/"/g, "") ?? null };
}

export interface ObjectInfo {
  size: number;
  contentType: string | null;
  contentDisposition: string | null;
  cacheControl: string | null;
  /** ETag sin comillas; en subidas de una sola parte es el MD5 en hexadecimal. */
  etag: string | null;
  metadata: Record<string, string>;
}

export async function headObject(key: string): Promise<ObjectInfo | null> {
  const response = await getR2().client.fetch(objectUrl(key), { method: "HEAD" });
  if (response.status === 404) return null;
  if (!response.ok) throw await r2Error("HEAD", key, response);

  const metadata: Record<string, string> = {};
  response.headers.forEach((value, name) => {
    if (name.startsWith("x-amz-meta-")) metadata[name.slice("x-amz-meta-".length)] = value;
  });
  return {
    size: Number(response.headers.get("content-length") ?? 0),
    contentType: response.headers.get("content-type"),
    contentDisposition: response.headers.get("content-disposition"),
    cacheControl: response.headers.get("cache-control"),
    etag: response.headers.get("etag")?.replace(/"/g, "") ?? null,
    metadata,
  };
}

/** Respuesta de R2 con el contenido (stream) o `null` si el objeto no existe. */
export async function getObject(key: string): Promise<Response | null> {
  const response = await getR2().client.fetch(objectUrl(key));
  if (response.status === 404) {
    // Se consume el XML corto del error en vez de `body.cancel()`: con el fetch de Next,
    // esperar la cancelación puede no resolverse nunca.
    await response.text().catch(() => "");
    return null;
  }
  if (!response.ok) throw await r2Error("GET", key, response);
  return response;
}

/** Borra un objeto. Borrar uno que no existe no es error en S3/R2. */
export async function deleteObject(key: string): Promise<void> {
  const response = await getR2().client.fetch(objectUrl(key), { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw await r2Error("DELETE", key, response);
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export interface ListedObject {
  key: string;
  size: number;
  etag: string | null;
}

/** Lista todos los objetos bajo un prefijo (ListObjectsV2 paginado). */
export async function listObjects(prefix = ""): Promise<ListedObject[]> {
  const objects: ListedObject[] = [];
  let continuationToken: string | null = null;

  do {
    const url = bucketUrl();
    url.searchParams.set("list-type", "2");
    url.searchParams.set("max-keys", "1000");
    if (prefix) url.searchParams.set("prefix", prefix);
    if (continuationToken) url.searchParams.set("continuation-token", continuationToken);

    const response = await getR2().client.fetch(url);
    if (!response.ok) throw await r2Error("LIST", prefix || "/", response);
    const xml = await response.text();

    for (const [, entry] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = entry.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
      if (!key) continue;
      objects.push({
        key: decodeXml(key),
        size: Number(entry.match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0),
        etag: entry.match(/<ETag>([\s\S]*?)<\/ETag>/)?.[1]?.replace(/&quot;|"/g, "") ?? null,
      });
    }

    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const next = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
    continuationToken = truncated && next ? decodeXml(next) : null;
  } while (continuationToken);

  return objects;
}

export interface CorsRule {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposeHeaders?: string[];
  maxAgeSeconds?: number;
}

/** Reemplaza la configuración CORS del bucket (PutBucketCors). */
export async function putBucketCors(rules: CorsRule[]): Promise<void> {
  const xmlRules = rules
    .map(
      (rule) =>
        `<CORSRule>${rule.allowedOrigins.map((o) => `<AllowedOrigin>${o}</AllowedOrigin>`).join("")}` +
        `${rule.allowedMethods.map((m) => `<AllowedMethod>${m}</AllowedMethod>`).join("")}` +
        `${rule.allowedHeaders.map((h) => `<AllowedHeader>${h}</AllowedHeader>`).join("")}` +
        `${(rule.exposeHeaders ?? []).map((h) => `<ExposeHeader>${h}</ExposeHeader>`).join("")}` +
        `${rule.maxAgeSeconds ? `<MaxAgeSeconds>${rule.maxAgeSeconds}</MaxAgeSeconds>` : ""}</CORSRule>`,
    )
    .join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration>${xmlRules}</CORSConfiguration>`;

  const url = bucketUrl();
  url.searchParams.set("cors", "");
  const response = await getR2().client.fetch(url, {
    method: "PUT",
    body,
    headers: { "Content-Type": "application/xml" },
  });
  if (!response.ok) throw await r2Error("PUT CORS", "(bucket)", response);
}

/** Configuración CORS actual del bucket en XML, o `null` si no tiene. */
export async function getBucketCorsXml(): Promise<string | null> {
  const url = bucketUrl();
  url.searchParams.set("cors", "");
  const response = await getR2().client.fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) throw await r2Error("GET CORS", "(bucket)", response);
  return response.text();
}
