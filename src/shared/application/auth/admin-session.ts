/**
 * Sesión del panel administrativo (cookie `insulae_session`).
 *
 * El valor de la cookie es un token firmado con HMAC-SHA256: `base64url(payload).firma`.
 * Antes era JSON plano y cualquiera podía escribir `role: "ADMIN"` a mano; ahora el
 * contenido solo prueba identidad y vigencia, y la autorización se calcula siempre
 * desde la base de datos (ver permissions.ts).
 *
 * Se implementa con Web Crypto (no con `node:crypto`) para poder verificar la firma
 * también en el middleware, que corre en el runtime edge.
 *
 * La sesión lleva una huella de la contraseña (`sv`): readAdminSession() la compara con la
 * guardada, así que cambiar o restablecer la contraseña cierra todas las sesiones abiertas.
 */

export const ADMIN_SESSION_COOKIE = "insulae_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días (el shell cierra por inactividad a los 15 min)
const ADMIN_RESET_TTL_SECONDS = 60 * 60; // 1 hora

const DEFAULT_DEV_SECRET = "dev-admin-session-secret-change-me";

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn("[admin-session] ADMIN_SESSION_SECRET no está definido; se usa el secreto de desarrollo.");
  }
  return DEFAULT_DEV_SECRET;
}

export interface AdminSession {
  userId: string;
  email: string | null;
  name: string;
  sv: string; // huella de la contraseña al iniciar sesión (ver passwordFingerprint)
  iat: number; // unix seconds
  exp: number; // unix seconds
}

const ADMIN_RESET_PURPOSE = "admin-reset-2";

export interface AdminResetToken {
  p: typeof ADMIN_RESET_PURPOSE;
  userId: string;
  pv: string; // huella de la contraseña al emitirlo (ver passwordFingerprint)
  exp: number;
}

// ---- utilidades base64url / HMAC (Web Crypto) ----

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array | null {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmac(body: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return new Uint8Array(sig);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function signPayload(payload: unknown): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = toBase64Url(await hmac(body));
  return `${body}.${sig}`;
}

async function verifyPayload<T extends { exp?: number }>(token: string | null | undefined): Promise<T | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const given = fromBase64Url(sig);
  if (!given) return null;
  const expected = await hmac(body);
  if (!constantTimeEqual(given, expected)) return null;
  const raw = fromBase64Url(body);
  if (!raw) return null;
  try {
    const payload = JSON.parse(decoder.decode(raw)) as T;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Huella de la contraseña guardada (HMAC: no se puede calcular ni revertir sin el secreto). La
 * llevan la sesión (`sv`) y el token de restablecimiento (`pv`), así que ambos dejan de valer
 * en cuanto la contraseña cambia. El prefijo separa los dos usos.
 */
async function passwordFingerprint(purpose: "sv" | "pv", passwordHash: string | null): Promise<string> {
  return toBase64Url(await hmac(`${purpose}:${passwordHash ?? ""}`)).slice(0, 22);
}

// ---- sesión ----

export async function signAdminSession(input: {
  userId: string;
  email: string | null;
  name: string;
  passwordHash: string | null;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSession = {
    userId: input.userId,
    email: input.email,
    name: input.name,
    sv: await passwordFingerprint("sv", input.passwordHash),
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
  };
  return signPayload(payload);
}

/**
 * Firma, vigencia y forma (lo que puede revisar el middleware sin base). Las sesiones sin `sv`
 * (formato anterior) se rechazan. Falta adminSessionIsCurrent, que hace readAdminSession().
 */
export async function verifyAdminSession(token: string | null | undefined): Promise<AdminSession | null> {
  const payload = await verifyPayload<AdminSession & { p?: unknown; condominiumId?: unknown }>(token);
  // Un token con propósito no es una sesión: antes un enlace de restablecimiento servía como
  // cookie. Tampoco una sesión del minisitio (lleva condominiumId), por si los secretos coincidieran.
  if (!payload || payload.p !== undefined || payload.condominiumId !== undefined) return null;
  if (typeof payload.userId !== "string" || !payload.userId || typeof payload.sv !== "string") return null;
  return payload;
}

export async function adminSessionIsCurrent(session: AdminSession, passwordHash: string | null): Promise<boolean> {
  return session.sv === (await passwordFingerprint("sv", passwordHash));
}

// ---- token de restablecimiento de contraseña (1 h, propósito acotado, un solo uso) ----

export async function signAdminResetToken(userId: string, passwordHash: string | null): Promise<string> {
  const payload: AdminResetToken = {
    p: ADMIN_RESET_PURPOSE,
    userId,
    pv: await passwordFingerprint("pv", passwordHash),
    exp: Math.floor(Date.now() / 1000) + ADMIN_RESET_TTL_SECONDS,
  };
  return signPayload(payload);
}

/**
 * Firma, vigencia y propósito. Falta comprobar con adminResetTokenIsCurrent que la contraseña
 * no cambió. Los tokens del formato anterior (sin `pv`, emitidos también por despliegues
 * viejos) se rechazan.
 */
export async function readAdminResetToken(token: string | null | undefined): Promise<AdminResetToken | null> {
  const payload = await verifyPayload<AdminResetToken>(token);
  if (!payload || payload.p !== ADMIN_RESET_PURPOSE || typeof payload.userId !== "string" || typeof payload.pv !== "string") {
    return null;
  }
  return payload;
}

export async function adminResetTokenIsCurrent(payload: AdminResetToken, passwordHash: string | null): Promise<boolean> {
  return payload.pv === (await passwordFingerprint("pv", passwordHash));
}
