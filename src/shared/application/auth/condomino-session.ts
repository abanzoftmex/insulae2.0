/**
 * Sesión del portal de condóminos (`/minisitio`).
 *
 * El token firmado vive en la cookie httpOnly `minisitio_session`, acotada a `/minisitio`
 * y sin Max-Age: es una cookie de sesión que el navegador descarta al cerrarse, igual que
 * el sessionStorage del minisitio independiente. El token caduca de todos modos al día.
 *
 * - `readCondominoSession()`  → solo verifica firma y vigencia (sin tocar la base).
 * - `requireCondominoSession()` → además confirma en la base que el usuario sigue activo y
 *   con acceso al portal. Úsalo al inicio de cada page.tsx y de cada server action: si el
 *   administrador revoca el acceso, la siguiente petición manda al login.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/db/prisma";
import {
  CONDOMINO_SESSION_COOKIE,
  MINISITIO_BASE_PATH,
  verifyCondominoToken,
  type CondominoTokenPayload,
} from "./condomino-token";
import { minisitioRoleWhere } from "./condomino-access";

export { CONDOMINO_SESSION_COOKIE, MINISITIO_BASE_PATH };

/** Verifica la cookie de sesión (firma + vigencia). No consulta la base. */
export const readCondominoSession = cache(async (): Promise<CondominoTokenPayload | null> => {
  const cookieStore = await cookies();
  return verifyCondominoToken(cookieStore.get(CONDOMINO_SESSION_COOKIE)?.value);
});

/**
 * ¿Sigue teniendo acceso al portal? Misma regla que el login: cuenta activa y (ADMIN, rol del
 * minisitio o al menos una asignación de área privativa activa).
 */
async function hasPortalAccess(session: CondominoTokenPayload): Promise<boolean> {
  const allowed = await prisma.user.count({
    where: {
      id: session.userId,
      condominiumId: session.condominiumId,
      isActive: true,
      OR: [
        { userType: "ADMIN" },
        { userRoles: { some: { role: minisitioRoleWhere(session.condominiumId) } } },
        { assignments: { some: { isActive: true } } },
      ],
    },
  });
  return allowed > 0;
}

/**
 * Sesión verificada contra la base. Sin sesión redirige al login; con el acceso revocado
 * pasa por `/minisitio/logout` para borrar la cookie antes de llegar al login.
 */
export const requireCondominoSession = cache(async (): Promise<CondominoTokenPayload> => {
  const session = await readCondominoSession();
  if (!session) redirect(`${MINISITIO_BASE_PATH}/login`);
  if (!(await hasPortalAccess(session))) redirect(`${MINISITIO_BASE_PATH}/logout?reason=revoked`);
  return session;
});

export async function setCondominoSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CONDOMINO_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: MINISITIO_BASE_PATH,
  });
}

export async function clearCondominoSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CONDOMINO_SESSION_COOKIE, "", { path: MINISITIO_BASE_PATH, maxAge: 0 });
}
