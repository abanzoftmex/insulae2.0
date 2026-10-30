import { prisma } from "./prisma";

/**
 * Búsqueda de usuarios por correo (principal, personal o de negocio) para el login y la
 * recuperación de contraseña, exacta salvo mayúsculas.
 *
 * No usar `equals` con `mode: "insensitive"` para esto: Prisma lo traduce a ILIKE, donde `_` y
 * `%` son comodines. Así `maria_garcia@hotmail.com` encontraba a `maria.garcia@hotmail.com` y
 * recibía su enlace de restablecimiento, y el correo `%` probaba una contraseña contra todas
 * las cuentas.
 */
export async function findUserIdsByEmail(email: string): Promise<string[]> {
  const value = email.trim();
  if (!value) return [];
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "User"
    WHERE lower("email") = lower(${value})
       OR lower("personalEmail") = lower(${value})
       OR lower("businessEmail") = lower(${value})`;
  return rows.map((row) => row.id);
}

/**
 * El correo guardado del usuario que coincide con `email`: los correos se envían a esa
 * dirección, nunca a lo que se tecleó.
 */
export function storedEmailMatching(
  user: { email: string | null; personalEmail: string | null; businessEmail: string | null },
  email: string,
): string | null {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;
  return [user.email, user.personalEmail, user.businessEmail].find((stored) => stored?.toLowerCase() === wanted) ?? null;
}
