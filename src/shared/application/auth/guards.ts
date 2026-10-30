/**
 * Guardias de autorización del panel administrativo.
 *
 * - `requirePageAccess(módulo)`  -> en Server Components (page.tsx). Redirige a /login si no hay
 *                                  sesión y a /acceso-denegado si el rol no puede leer el módulo.
 * - `assertPermission(módulo, acción)` -> en Server Actions. Lanza PermissionDeniedError; las
 *                                  acciones que envuelven su cuerpo en try/catch devuelven el
 *                                  mensaje al cliente como cualquier otro error de negocio.
 * - `apiAccessDenied(módulo, acción)` -> en route handlers de `/api`, que el middleware no cubre.
 *                                  Devuelve la respuesta 401/403 o null si hay permiso.
 *
 * Ambos aceptan un módulo o una lista (basta con tener permiso en uno de ellos), para las
 * pantallas compartidas entre personal y condóminos, como la participación en asambleas.
 */
import { redirect } from "next/navigation";
import { getUserPermissions, hasPermission, readAdminSession, type PermissionAction } from "./permissions";
import type { ModuleName } from "./modules";

const ACTION_LABEL: Record<PermissionAction, string> = {
  canRead: "consultar",
  canCreate: "crear registros en",
  canUpdate: "modificar",
  canDelete: "eliminar registros de",
};

export class PermissionDeniedError extends Error {
  readonly module: string;
  readonly action: PermissionAction;

  constructor(module: ModuleName | readonly ModuleName[], action: PermissionAction) {
    const label = Array.isArray(module) ? module.join(" / ") : String(module);
    super(`No tienes permiso para ${ACTION_LABEL[action]} ${label}.`);
    this.name = "PermissionDeniedError";
    this.module = label;
    this.action = action;
  }
}

export async function requirePageAccess(
  module: ModuleName | readonly ModuleName[],
  action: PermissionAction = "canRead",
): Promise<void> {
  const session = await readAdminSession();
  if (!session) redirect("/login");

  const permissions = await getUserPermissions();
  if (!hasPermission(permissions, module, action)) {
    const label = Array.isArray(module) ? module[0] : String(module);
    redirect(`/acceso-denegado?modulo=${encodeURIComponent(label)}`);
  }
}

export async function assertPermission(
  module: ModuleName | readonly ModuleName[],
  action: PermissionAction,
): Promise<void> {
  const permissions = await getUserPermissions();
  if (!hasPermission(permissions, module, action)) {
    throw new PermissionDeniedError(module, action);
  }
}

export async function apiAccessDenied(
  module: ModuleName | readonly ModuleName[],
  action: PermissionAction = "canRead",
): Promise<Response | null> {
  if (!(await readAdminSession())) {
    return Response.json({ error: "Sesión no válida" }, { status: 401 });
  }
  if (!hasPermission(await getUserPermissions(), module, action)) {
    return Response.json({ error: new PermissionDeniedError(module, action).message }, { status: 403 });
  }
  return null;
}
