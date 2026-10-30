/**
 * Contraseñas: scrypt con sal propia por contraseña, guardado como
 * `scrypt$<log2 N>$<r>$<p>$<sal>$<hash>` (base64url).
 *
 * Antes se guardaba SHA-256 sin sal (y el legacy traía MD5): se rompe a velocidad de GPU y la
 * misma contraseña da el mismo hash en todas las cuentas. Esos formatos se siguen aceptando al
 * iniciar sesión, y en cuanto alguien entra con uno se reemplaza por scrypt (`needsRehash`).
 *
 * Solo servidor (node:crypto): el middleware nunca verifica contraseñas.
 */
import crypto from "crypto";

const LOG_N = 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;
// N = 2^15 con r = 8 usa 32 MiB, justo el máximo por defecto de Node.
const MAXMEM = 64 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keyLength: number, logN: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, { N: 2 ** logN, r, p, maxmem: MAXMEM }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = await scrypt(password, salt, KEY_LENGTH, LOG_N, R, P);
  return ["scrypt", LOG_N, R, P, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

const LEGACY_DIGESTS: [RegExp, string][] = [
  [/^[0-9a-f]{64}$/i, "sha256"],
  [/^[0-9a-f]{32}$/i, "md5"],
];

/**
 * `ok`: la contraseña coincide. `needsRehash`: coincide pero está en un formato heredado (o con
 * parámetros viejos) y conviene guardarla de nuevo con hashPassword().
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };

  if (stored.startsWith("scrypt$")) {
    const [, logN, r, p, salt, hash] = stored.split("$");
    const params = [Number(logN), Number(r), Number(p)];
    if (!salt || !hash || params.some((n) => !Number.isInteger(n) || n < 1) || params[0] > 20 || params[1] > 32 || params[2] > 4) {
      return { ok: false, needsRehash: false };
    }
    const expected = Buffer.from(hash, "base64url");
    const actual = await scrypt(password, Buffer.from(salt, "base64url"), expected.length, params[0], params[1], params[2]);
    const ok = safeEqual(actual, expected);
    return { ok, needsRehash: ok && (params[0] !== LOG_N || params[1] !== R || params[2] !== P) };
  }

  const digest = LEGACY_DIGESTS.find(([format]) => format.test(stored))?.[1];
  if (!digest) return { ok: false, needsRehash: false };
  const ok = safeEqual(
    Buffer.from(crypto.createHash(digest).update(password).digest("hex")),
    Buffer.from(stored.toLowerCase()),
  );
  return { ok, needsRehash: ok };
}

let dummyHash: Promise<string> | null = null;

/**
 * Hace el mismo trabajo que verificar una contraseña real, para que "el correo no existe" y "la
 * contraseña no coincide" tarden lo mismo y el tiempo de respuesta no revele qué cuentas existen.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword(crypto.randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}
