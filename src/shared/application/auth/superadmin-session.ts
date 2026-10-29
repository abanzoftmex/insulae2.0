/**
 * Modo superadministrador del minisitio (`/minisitio/superadmin-insulae`).
 *
 * Credenciales en variables de entorno (SUPERADMIN_USER / SUPERADMIN_PASSWORD) y sesión en
 * una cookie httpOnly firmada con SUPERADMIN_KEY que dura 15 minutos; se puede extender
 * otros 15 volviendo a teclear la contraseña. Con el modo activo se puede suplantar a
 * cualquier usuario del condominio desde la burbuja flotante.
 *
 * Si falta SUPERADMIN_KEY el modo queda deshabilitado (antes el minisitio fallaba al
 * importar el módulo y tumbaba toda la app).
 */
import { cookies } from "next/headers";
import { safeEqual, signToken, verifyToken } from "./signed-token";
import { MINISITIO_BASE_PATH } from "./condomino-token";

export const SUPERADMIN_COOKIE = "minisitio_superadmin";
export const SUPERADMIN_TTL_MS = 15 * 60 * 1000; // 15 minutos

export interface SuperadminSession {
  /** Epoch en milisegundos. */
  expiresAt: number;
}

function getKey(): string | null {
  return process.env.SUPERADMIN_KEY || null;
}

export function isSuperadminConfigured(): boolean {
  return Boolean(getKey() && process.env.SUPERADMIN_USER && process.env.SUPERADMIN_PASSWORD);
}

/** Valida usuario + contraseña contra las variables de entorno. */
export function checkSuperadminCredentials(user: string, password: string): boolean {
  const expectedUser = process.env.SUPERADMIN_USER || "";
  const expectedPassword = process.env.SUPERADMIN_PASSWORD || "";
  if (!expectedUser || !expectedPassword) return false;
  return safeEqual(user || "", expectedUser) && safeEqual(password || "", expectedPassword);
}

/** Valida solo la contraseña (para extender la sesión). */
export function checkSuperadminPassword(password: string): boolean {
  const expectedPassword = process.env.SUPERADMIN_PASSWORD || "";
  if (!expectedPassword) return false;
  return safeEqual(password || "", expectedPassword);
}

export async function readSuperadminSession(): Promise<SuperadminSession | null> {
  const key = getKey();
  if (!key) return null;
  const cookieStore = await cookies();
  const payload = await verifyToken<{ exp: number; expMs: number }>(cookieStore.get(SUPERADMIN_COOKIE)?.value, key);
  if (!payload || !payload.expMs || Date.now() > payload.expMs) return null;
  return { expiresAt: payload.expMs };
}

/** Abre o extiende la sesión hasta `expiresAt` (epoch ms). */
export async function setSuperadminSessionCookie(expiresAt: number): Promise<void> {
  const key = getKey();
  if (!key) throw new Error("SUPERADMIN_KEY no está configurado.");
  const token = await signToken({ exp: Math.ceil(expiresAt / 1000), expMs: expiresAt } as { exp: number }, key);
  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: MINISITIO_BASE_PATH,
    maxAge: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)),
  });
}

export async function clearSuperadminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_COOKIE, "", { path: MINISITIO_BASE_PATH, maxAge: 0 });
}
