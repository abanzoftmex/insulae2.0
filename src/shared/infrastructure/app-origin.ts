import { headers } from "next/headers";

/**
 * Origen público de la app (`https://dominio`) para los enlaces que salen de ella: correos de
 * restablecimiento de contraseña, convocatorias, WhatsApp y vistas previas.
 *
 * Nunca sale de la petición (un parámetro del navegador o las cabeceras `Host` y
 * `X-Forwarded-Host`): así cualquiera podía pedir el restablecimiento de otra cuenta con su
 * propio dominio, y el correo legítimo le entregaba el token a quien abriera el enlace.
 */
export async function appOrigin(): Promise<string> {
  return resolveAppOrigin(process.env, (await headers()).get("host"));
}

const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

/**
 * 1. `APP_BASE_URL`, si se define (por ejemplo, al agregar un dominio propio).
 * 2. En Vercel, sus variables de sistema: el dominio de producción del proyecto en producción y
 *    el de la rama en previews.
 * 3. En local, el host de la petición solo si es localhost; si no, `http://localhost:<PORT>`.
 */
export function resolveAppOrigin(env: Record<string, string | undefined>, requestHost: string | null): string {
  const configured = toOrigin(env.APP_BASE_URL);
  if (configured) return configured;

  const vercelHost =
    env.VERCEL_ENV === "production"
      ? env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL
      : env.VERCEL_ENV === "preview"
        ? env.VERCEL_BRANCH_URL || env.VERCEL_URL
        : undefined;
  const vercel = vercelHost ? toOrigin(`https://${vercelHost}`) : null;
  if (vercel) return vercel;

  const host = (requestHost ?? "").trim().toLowerCase();
  if (LOOPBACK_HOST.test(host)) return `http://${host}`;
  return `http://localhost:${env.PORT || 3000}`;
}

/** `protocolo://host[:puerto]` sin ruta; null si no es una URL http(s). */
function toOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}
