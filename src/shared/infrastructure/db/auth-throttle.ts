import { headers } from "next/headers";
import { prisma } from "./prisma";

/**
 * Límite de intentos con ventana fija para el login, las solicitudes de restablecimiento de
 * contraseña, el cambio de contraseña y el modo superadmin. Se guarda en la tabla AuthThrottle
 * para que valga entre instancias de Vercel.
 *
 * El intento se cuenta ANTES de verificar la contraseña, con un solo INSERT … ON CONFLICT por
 * regla (atómico): revisar y registrar por separado dejaba pasar a todas las peticiones en
 * paralelo.
 *
 * Si la tabla aún no existe (migración sin aplicar), no limita: avisa una vez en el log y deja
 * pasar, para que desplegar el código antes que la migración no tumbe el login.
 */
export interface ThrottleRule {
  key: string;
  limit: number;
  windowSeconds: number;
}

const FIFTEEN_MINUTES = 15 * 60;
const ONE_HOUR = 60 * 60;

/** Las claves salen de lo que manda el cliente: se acotan para que no inflen la tabla. */
const keyPart = (value: string) => value.trim().toLowerCase().slice(0, 200);

export function loginThrottleRules(email: string, ip: string): ThrottleRule[] {
  const account = keyPart(email);
  const from = keyPart(ip);
  return [
    { key: `login:cuenta-ip:${account}|${from}`, limit: 5, windowSeconds: FIFTEEN_MINUTES },
    { key: `login:ip:${from}`, limit: 30, windowSeconds: FIFTEEN_MINUTES },
    // Tope por cuenta contra ataques desde muchas IPs. Alto a propósito: quien conoce el correo
    // puede agotarlo y bloquear a la persona, así que solo frena ataques masivos.
    { key: `login:cuenta:${account}`, limit: 50, windowSeconds: ONE_HOUR },
  ];
}

/** Claves de cuenta que se borran tras un login correcto (la de IP sigue contando). */
export function loginAccountKeys(rules: ThrottleRule[]): string[] {
  return rules.filter((rule) => rule.key.startsWith("login:cuenta")).map((rule) => rule.key);
}

/** Evita usar el "olvidé mi contraseña" para llenar de correos a alguien. */
export function resetRequestThrottleRules(email: string, ip: string): ThrottleRule[] {
  return [
    { key: `reset:ip:${keyPart(ip)}`, limit: 10, windowSeconds: ONE_HOUR },
    { key: `reset:cuenta:${keyPart(email)}`, limit: 5, windowSeconds: ONE_HOUR },
  ];
}

/** Intentos de la contraseña actual al cambiarla con sesión abierta. */
export function passwordChangeThrottleRules(userId: string): ThrottleRule[] {
  return [{ key: `cambio:cuenta:${keyPart(userId)}`, limit: 5, windowSeconds: FIFTEEN_MINUTES }];
}

/** Una sola credencial compartida: además del tope por IP, uno global. */
export function superadminThrottleRules(ip: string): ThrottleRule[] {
  return [
    { key: `superadmin:ip:${keyPart(ip)}`, limit: 5, windowSeconds: FIFTEEN_MINUTES },
    { key: "superadmin:global", limit: 20, windowSeconds: ONE_HOUR },
  ];
}

/** IP del cliente. En Vercel `x-forwarded-for` la pone la plataforma, no el cliente. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim() || "desconocida";
}

let missingTableWarned = false;
let tableCheck: { ready: boolean; at: number } | null = null;
const RECHECK_MS = 5 * 60 * 1000;

function warnMissingTable() {
  if (missingTableWarned) return;
  missingTableWarned = true;
  console.warn("[auth-throttle] No existe la tabla AuthThrottle (migración sin aplicar): no se limitan intentos.");
}

/** ¿Existe la tabla? Se revisa una vez (y cada 5 min mientras falte) para no llenar el log de errores. */
async function tableReady(): Promise<boolean> {
  if (tableCheck && (tableCheck.ready || Date.now() - tableCheck.at < RECHECK_MS)) return tableCheck.ready;
  try {
    // En el esquema de la app, no en pg_temp (to_regclass a secas también ve tablas temporales).
    const rows = await prisma.$queryRaw<Array<{ ok: boolean }>>`
      SELECT to_regclass(format('%I.%I', current_schema(), 'AuthThrottle')) IS NOT NULL AS ok`;
    tableCheck = { ready: Boolean(rows[0]?.ok), at: Date.now() };
  } catch {
    // Error pasajero de la base: no se recuerda como "falta la tabla", se reintenta la próxima vez.
    return false;
  }
  if (!tableCheck.ready) warnMissingTable();
  return tableCheck.ready;
}

function isMissingTable(error: unknown): boolean {
  const e = error as { code?: unknown; message?: unknown; meta?: unknown; cause?: unknown };
  const text = [e?.code, e?.message, JSON.stringify(e?.meta ?? ""), String(e?.cause ?? "")].join(" ");
  return /42P01|P2021|"AuthThrottle" does not exist|AuthThrottle.{0,40}(does not exist|no existe)/i.test(text);
}

async function guarded<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  if (!(await tableReady())) return fallback;
  try {
    return await run();
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    tableCheck = { ready: false, at: Date.now() };
    warnMissingTable();
    return fallback;
  }
}

/**
 * Cuenta un intento en cada regla y dice si sigue dentro de todos los límites. Si alguna ventana
 * ya venció, esa regla empieza una nueva.
 */
export async function consumeAttempt(rules: ThrottleRule[]): Promise<boolean> {
  if (rules.length === 0) return true;
  return guarded(true, async () => {
    let allowed = true;
    for (const rule of rules) {
      const rows = await prisma.$queryRaw<Array<{ count: number }>>`
        INSERT INTO "AuthThrottle" ("key", "count", "windowStart", "updatedAt")
        VALUES (${rule.key}, 1, now(), now())
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "AuthThrottle"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
                         THEN 1 ELSE "AuthThrottle"."count" + 1 END,
          "windowStart" = CASE WHEN "AuthThrottle"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
                               THEN now() ELSE "AuthThrottle"."windowStart" END,
          "updatedAt" = now()
        RETURNING "count"`;
      if (Number(rows[0]?.count ?? 0) > rule.limit) allowed = false;
    }
    // Limpieza ocasional de contadores viejos para que la tabla no crezca sin fin.
    if (Math.random() < 0.02) {
      await prisma.$executeRaw`DELETE FROM "AuthThrottle" WHERE "updatedAt" < now() - interval '1 day'`;
    }
    return allowed;
  });
}

/** Borra contadores, por ejemplo los de la cuenta tras un login correcto. */
export async function clearThrottle(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await guarded(undefined, async () => {
    await prisma.$executeRaw`DELETE FROM "AuthThrottle" WHERE "key" = ANY(${keys})`;
  });
}
