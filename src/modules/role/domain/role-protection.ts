import { normalizeRoleLabel } from "@/shared/application/auth/condomino-access";

const RESERVED_MINISITIO_NAMES = new Set(["solo minisitio", "condomino"]);
const RESERVED_ADMIN_IDENTITY_NAMES = new Set(["master", "direccion insulae"]);

export interface RoleIdentityRecord {
  id: string;
  name: string;
  legacyIdGral: number;
}

export function normalizeRoleIdentityName(name: string | null | undefined): string {
  return normalizeRoleLabel(name);
}

/**
 * Un rol está protegido como rol reservado del sistema si su `legacyIdGral !== 0`
 * (Solo Minisitio = 5 y roles patrimoniales/condómino 1..7) o si su nombre corresponde
 * al rol reservado del portal de condóminos.
 */
export function isReservedSystemRole(role: {
  legacyIdGral?: number | null;
  name?: string | null;
}): boolean {
  if ((role.legacyIdGral ?? 0) !== 0) return true;
  return RESERVED_MINISITIO_NAMES.has(normalizeRoleIdentityName(role.name));
}

export type RoleVisualCategory = "ADMINISTRATIVO" | "PATRIMONIAL" | "MINISITIO";

export function getRoleVisualCategory(role: {
  legacyIdGral?: number | null;
  name?: string | null;
}): RoleVisualCategory {
  const legacyId = role.legacyIdGral ?? 0;
  if (legacyId === 5 || normalizeRoleIdentityName(role.name) === "solo minisitio") {
    return "MINISITIO";
  }
  if (legacyId === 0) {
    return "ADMINISTRATIVO";
  }
  return "PATRIMONIAL";
}

export function getRoleVisualCategoryLabel(category: RoleVisualCategory): string {
  switch (category) {
    case "ADMINISTRATIVO":
      return "Administrativo";
    case "PATRIMONIAL":
      return "Patrimonial";
    case "MINISITIO":
      return "Minisitio";
  }
}

export function assertValidRoleCreationName(
  rawName: string,
  existingRoles: RoleIdentityRecord[],
): string {
  const trimmed = rawName.trim();
  if (!trimmed) {
    throw new Error("El nombre del rol es obligatorio.");
  }

  const normalized = normalizeRoleIdentityName(trimmed);
  if (RESERVED_MINISITIO_NAMES.has(normalized)) {
    throw new Error(
      `El nombre «${trimmed}» está reservado para el acceso al minisitio y no puede crearse manualmente.`,
    );
  }

  if (RESERVED_ADMIN_IDENTITY_NAMES.has(normalized)) {
    const alreadyExists = existingRoles.some(
      (role) => normalizeRoleIdentityName(role.name) === normalized,
    );
    if (alreadyExists || normalized === "master") {
      throw new Error(
        `El nombre «${trimmed}» está reservado para un rol del sistema en este condominio.`,
      );
    }
  }

  const collidesWithReserved = existingRoles.find(
    (role) =>
      normalizeRoleIdentityName(role.name) === normalized &&
      isReservedSystemRole(role),
  );
  if (collidesWithReserved) {
    throw new Error(
      `El nombre «${trimmed}» coincide con el rol reservado «${collidesWithReserved.name}».`,
    );
  }

  return trimmed;
}

export function assertValidRoleUpdate(
  targetRole: RoleIdentityRecord & { isActive: boolean },
  rawNextName: string,
  existingRoles: RoleIdentityRecord[],
): string {
  if (!targetRole.isActive) {
    throw new Error("El rol está desactivado o no existe y no puede modificarse.");
  }

  if (isReservedSystemRole(targetRole)) {
    throw new Error(
      `El rol reservado «${targetRole.name}» está protegido y no puede modificarse ni recibir permisos administrativos.`,
    );
  }

  const trimmedNext = rawNextName.trim();
  if (!trimmedNext) {
    throw new Error("El nombre del rol es obligatorio.");
  }

  const normalizedNext = normalizeRoleIdentityName(trimmedNext);
  if (RESERVED_MINISITIO_NAMES.has(normalizedNext)) {
    throw new Error(
      `No puedes renombrar un rol ordinario al nombre reservado «${trimmedNext}».`,
    );
  }

  const conflict = existingRoles.find(
    (role) =>
      role.id !== targetRole.id &&
      normalizeRoleIdentityName(role.name) === normalizedNext &&
      (isReservedSystemRole(role) || RESERVED_ADMIN_IDENTITY_NAMES.has(normalizedNext)),
  );
  if (conflict) {
    throw new Error(
      `El nombre «${trimmedNext}» está reservado por «${conflict.name}» en este condominio.`,
    );
  }

  if (
    RESERVED_ADMIN_IDENTITY_NAMES.has(normalizedNext) &&
    normalizeRoleIdentityName(targetRole.name) !== normalizedNext
  ) {
    throw new Error(
      `El nombre «${trimmedNext}» está reservado y no puede asignarse a otro rol.`,
    );
  }

  return trimmedNext;
}

export function assertCanDeleteOrDeactivateRole(role: {
  name: string;
  legacyIdGral?: number | null;
}): void {
  if (isReservedSystemRole(role)) {
    throw new Error(
      `El rol reservado «${role.name}» está protegido y no puede eliminarse ni desactivarse.`,
    );
  }
}

