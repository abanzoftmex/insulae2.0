/**
 * Tokens firmados con HMAC-SHA256: `base64url(payload).firma`.
 *
 * Implementado con Web Crypto (no con `node:crypto`) para poder verificar la firma tanto en
 * Server Components/Actions como en el middleware, que corre en el runtime edge.
 * El payload debe traer `exp` en segundos unix; un token vencido se trata como inválido.
 */

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

async function hmac(secret: string, body: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
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

export async function signToken(payload: { exp: number }, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = toBase64Url(await hmac(secret, body));
  return `${body}.${sig}`;
}

export async function verifyToken<T extends { exp?: number }>(
  token: string | null | undefined,
  secret: string,
): Promise<T | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const given = fromBase64Url(sig);
  if (!given) return null;
  const expected = await hmac(secret, body);
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

/** Comparación de strings en tiempo constante (credenciales leídas de variables de entorno). */
export function safeEqual(a: string, b: string): boolean {
  return constantTimeEqual(encoder.encode(String(a)), encoder.encode(String(b)));
}
