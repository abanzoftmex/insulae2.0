/**
 * Tokens del portal de condóminos (minisitio, `/minisitio`).
 *
 * - Sesión: viaja en la cookie httpOnly `minisitio_session` (ver condomino-session.ts).
 *   Solo prueba identidad y vigencia (1 día); la autorización (usuario activo y con acceso
 *   al portal) se revalida contra la base en cada página y acción con
 *   requireCondominoSession(), de modo que revocar el acceso surte efecto de inmediato.
 * - Restablecimiento de contraseña: token de propósito acotado que dura 1 hora y sirve una
 *   sola vez (lleva una huella de la contraseña guardada).
 *
 * Web Crypto (signed-token.ts) para que el middleware también pueda verificar la firma.
 */
import { hmacDigest, signToken, verifyToken } from "./signed-token";

/** Cookie httpOnly de la sesión del condómino y prefijo del portal (los usa también el middleware). */
export const CONDOMINO_SESSION_COOKIE = "minisitio_session";
export const MINISITIO_BASE_PATH = "/minisitio";

const DEFAULT_DEV_SECRET = "dev-condomino-secret-change-me";

function getSecret(): string {
  const secret =
    process.env.MINISITIO_SESSION_SECRET || process.env.CONDOMINO_API_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn("[condomino-token] MINISITIO_SESSION_SECRET no está definido; se usa el secreto de desarrollo.");
  }
  return DEFAULT_DEV_SECRET;
}

export const CONDOMINO_SESSION_TTL_SECONDS = 60 * 60 * 24; // 1 día
const RESET_TTL_SECONDS = 60 * 60; // 1 hora

export interface CondominoTokenPayload {
  userId: string;
  condominiumId: string;
  exp: number; // unix seconds
}

export async function signCondominoToken(input: { userId: string; condominiumId: string }): Promise<string> {
  const payload: CondominoTokenPayload = {
    userId: input.userId,
    condominiumId: input.condominiumId,
    exp: Math.floor(Date.now() / 1000) + CONDOMINO_SESSION_TTL_SECONDS,
  };
  return signToken(payload, getSecret());
}

export async function verifyCondominoToken(token: string | null | undefined): Promise<CondominoTokenPayload | null> {
  const payload = await verifyToken<CondominoTokenPayload & { p?: string }>(token, getSecret());
  if (!payload || payload.p || !payload.userId || !payload.condominiumId) return null;
  return { userId: payload.userId, condominiumId: payload.condominiumId, exp: payload.exp };
}

// ---- Tokens de restablecimiento de contraseña (purpose-scoped, 1h) ----

const RESET_PURPOSE = "reset-2";

export interface ResetTokenPayload {
  p: typeof RESET_PURPOSE;
  userId: string;
  email: string;
  pv: string; // huella de la contraseña al emitirlo (ver passwordVersion)
  exp: number;
}

/**
 * Huella de la contraseña guardada (HMAC: no se puede calcular ni revertir sin el secreto). El
 * token la lleva, así que deja de valer en cuanto la contraseña cambia: sirve una sola vez.
 */
async function passwordVersion(passwordHash: string | null): Promise<string> {
  return (await hmacDigest(getSecret(), `pv:${passwordHash ?? ""}`)).slice(0, 22);
}

export async function signResetToken(input: { userId: string; email: string; passwordHash: string | null }): Promise<string> {
  const payload: ResetTokenPayload = {
    p: RESET_PURPOSE,
    userId: input.userId,
    email: input.email,
    pv: await passwordVersion(input.passwordHash),
    exp: Math.floor(Date.now() / 1000) + RESET_TTL_SECONDS,
  };
  return signToken(payload, getSecret());
}

/**
 * Firma, vigencia y propósito. Falta comprobar con resetTokenIsCurrent que la contraseña no
 * cambió. Los tokens del formato anterior (sin `pv`, emitidos también por despliegues viejos
 * y por la API /api/condomino que ya no existe) se rechazan.
 */
export async function readResetToken(token: string | null | undefined): Promise<ResetTokenPayload | null> {
  const payload = await verifyToken<ResetTokenPayload>(token, getSecret());
  if (!payload || payload.p !== RESET_PURPOSE || !payload.userId || !payload.email || typeof payload.pv !== "string") {
    return null;
  }
  return payload;
}

export async function resetTokenIsCurrent(payload: ResetTokenPayload, passwordHash: string | null): Promise<boolean> {
  return payload.pv === (await passwordVersion(passwordHash));
}
