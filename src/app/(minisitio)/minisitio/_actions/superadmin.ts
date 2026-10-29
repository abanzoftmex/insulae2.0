"use server";

/**
 * Modo superadministrador: abrir/extender/cerrar la sesión y suplantar usuarios.
 * Antes pasaba por /api/superadmin/* del minisitio y /api/dev/* de insulae2.0; ahora la
 * suplantación firma el token en el mismo proceso, sin secreto compartido.
 */
import {
  SUPERADMIN_TTL_MS,
  checkSuperadminCredentials,
  checkSuperadminPassword,
  clearSuperadminSessionCookie,
  isSuperadminConfigured,
  readSuperadminSession,
  setSuperadminSessionCookie,
} from "@/shared/application/auth/superadmin-session";
import { clearCondominoSessionCookie, setCondominoSessionCookie } from "@/shared/application/auth/condomino-session";
import { signCondominoToken } from "@/shared/application/auth/condomino-token";
import { getImpersonationTarget } from "@/modules/minisitio/application/auth.service";
import { listUsersForSuperadmin, type SuperadminUserOption } from "@/modules/minisitio/infrastructure/queries/superadmin.queries";
import type { ActionResult, MinisitioSessionInfo } from "@/modules/minisitio/domain/types";

const EXPIRED_MESSAGE = "Sesión de superadministrador inválida o expirada.";

export async function validateSuperadminAction(input: { user: string; password: string }): Promise<ActionResult<{ expiresAt: number }>> {
  if (!input?.user || !input?.password) return { success: false, message: "Usuario y contraseña son requeridos" };
  if (!isSuperadminConfigured()) return { success: false, message: "El modo superadministrador no está configurado." };
  if (!checkSuperadminCredentials(input.user, input.password)) {
    return { success: false, message: "Usuario o contraseña incorrectos" };
  }
  const expiresAt = Date.now() + SUPERADMIN_TTL_MS;
  await setSuperadminSessionCookie(expiresAt);
  return { success: true, expiresAt, message: "Acceso de superadministrador activado" };
}

/** Extiende la sesión 15 minutos más sobre el tiempo restante; pide de nuevo la contraseña. */
export async function extendSuperadminAction(password: string): Promise<ActionResult<{ expiresAt: number }>> {
  const session = await readSuperadminSession();
  if (!session) return { success: false, message: "La sesión de superadministrador expiró. Vuelve a ingresar." };
  if (!password) return { success: false, message: "La contraseña es requerida" };
  if (!checkSuperadminPassword(password)) return { success: false, message: "Contraseña incorrecta" };

  const expiresAt = Math.max(Date.now(), session.expiresAt) + SUPERADMIN_TTL_MS;
  await setSuperadminSessionCookie(expiresAt);
  return { success: true, expiresAt, message: "Sesión extendida 15 minutos" };
}

export async function listSuperadminUsersAction(search: string): Promise<ActionResult<{ users: SuperadminUserOption[] }>> {
  if (!(await readSuperadminSession())) return { success: false, message: EXPIRED_MESSAGE };
  try {
    return { success: true, users: await listUsersForSuperadmin(search) };
  } catch (error) {
    console.error("[minisitio] listSuperadminUsersAction:", error);
    return { success: false, message: "No se pudo obtener la lista de usuarios." };
  }
}

/** Abre la sesión del condómino elegido; todo el portal opera ya como ese usuario. */
export async function impersonateAction(userId: string): Promise<ActionResult<MinisitioSessionInfo>> {
  if (!(await readSuperadminSession())) return { success: false, message: EXPIRED_MESSAGE };
  try {
    const target = await getImpersonationTarget(userId);
    if (!target.ok) return { success: false, message: target.message };
    await setCondominoSessionCookie(await signCondominoToken(target.session));
    return { success: true, message: "Usuario suplantado correctamente", ...target.info };
  } catch (error) {
    console.error("[minisitio] impersonateAction:", error);
    return { success: false, message: "No se pudo suplantar al usuario." };
  }
}

/** Termina la sesión del usuario suplantado sin cerrar el modo superadministrador. */
export async function endImpersonationAction(): Promise<ActionResult> {
  if (!(await readSuperadminSession())) return { success: false, message: EXPIRED_MESSAGE };
  await clearCondominoSessionCookie();
  return { success: true, message: "Sesión del usuario finalizada" };
}

/** Cierra el modo superadministrador y la sesión del condómino suplantado. */
export async function deactivateSuperadminAction(): Promise<ActionResult> {
  await clearSuperadminSessionCookie();
  await clearCondominoSessionCookie();
  return { success: true, message: "Modo superadministrador cerrado" };
}
