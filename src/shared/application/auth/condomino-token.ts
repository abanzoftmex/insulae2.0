/**
 * Token de sesión para el portal de condóminos (minisitio).
 * HMAC-SHA256 firmado por insulae2.0; el minisitio lo guarda y lo reenvía como Bearer.
 * Sin dependencias externas (solo crypto de Node).
 *
 * El token solo prueba identidad y vigencia (1 día). La autorización (usuario activo y
 * rol "Solo Minisitio") se revalida en cada petición con requireCondomino()
 * (ver condomino-session.ts), de modo que revocar el rol surte efecto de inmediato.
 */
import crypto from "crypto";

const SECRET =
  process.env.CONDOMINO_API_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "dev-condomino-secret-change-me";

const TTL_SECONDS = 60 * 60 * 24; // 1 día

export interface CondominoTokenPayload {
  userId: string;
  condominiumId: string;
  exp: number; // unix seconds
}

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

export function signCondominoToken(input: { userId: string; condominiumId: string }): string {
  const payload: CondominoTokenPayload = {
    userId: input.userId,
    condominiumId: input.condominiumId,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyCondominoToken(token: string | null | undefined): CondominoTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as CondominoTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.userId || !payload.condominiumId) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- Tokens de restablecimiento de contraseña (purpose-scoped, 1h) ----
const RESET_TTL_SECONDS = 60 * 60;

export interface ResetTokenPayload {
  p: "reset";
  userId: string;
  email: string;
  exp: number;
}

export function signResetToken(input: { userId: string; email: string }): string {
  const payload: ResetTokenPayload = {
    p: "reset",
    userId: input.userId,
    email: input.email,
    exp: Math.floor(Date.now() / 1000) + RESET_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyResetToken(token: string | null | undefined): ResetTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as ResetTokenPayload;
    if (payload.p !== "reset" || !payload.userId || !payload.email) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Extrae y valida el token del header Authorization: Bearer <token>. */
export function getCondominoFromRequest(request: Request): CondominoTokenPayload | null {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifyCondominoToken(m[1].trim());
}
