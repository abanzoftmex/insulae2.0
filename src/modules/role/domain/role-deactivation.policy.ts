import { MODULES } from "@/shared/application/auth/modules";
import {
  resolveUserEffectiveEmail,
  resolveUserEffectivePhone,
} from "@/shared/utils/user-contact";
import type { AffectedRoleUser, RoleDeactivationImpact } from "./role.types";

export interface PolicyRolePermission {
  isActive: boolean;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  module: {
    name: string;
    isActive: boolean;
  };
}

export interface PolicyRoleRecord {
  id: string;
  condominiumId: string;
  legacyIdGral: number;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: PolicyRolePermission[];
}

export interface PolicyUserRecord {
  id: string;
  condominiumId: string;
  isActive: boolean;
  userType: string;
  firstName: string | null;
  lastName: string | null;
  lastNamePaterno: string | null;
  lastNameMaterno: string | null;
  businessName: string | null;
  commercialName: string | null;
  email: string | null;
  personalEmail: string | null;
  businessEmail: string | null;
  phone: string | null;
  personalPhone: string | null;
  businessPhone: string | null;
  initialRole: string | null;
  userRoles: Array<{
    roleId: string;
    role: {
      id: string;
      name: string;
      isActive: boolean;
    };
  }>;
}

export function resolveUserDisplayName(user: PolicyUserRecord): string {
  const business = user.businessName?.trim();
  const full = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const fullPaternoMaterno = [
    user.firstName,
    user.lastNamePaterno,
    user.lastNameMaterno,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (user.userType === "LEGAL_ENTITY" && business) {
    return business;
  }
  if (full) return full;
  if (fullPaternoMaterno) return fullPaternoMaterno;
  if (business) return business;
  if (user.commercialName?.trim()) return user.commercialName.trim();

  const email = resolveUserEffectiveEmail(user);
  if (email) return email;

  const phone = resolveUserEffectivePhone(user);
  if (phone) return phone;

  return "Sin nombre";
}

/**
 * Un rol puede administrar el catálogo de roles si está activo y tiene permiso
 * activo de lectura + edición + eliminación sobre el módulo "Roles".
 */
export function canRoleAdministerRoles(role: PolicyRoleRecord): boolean {
  if (!role.isActive) return false;
  return role.permissions.some(
    (p) =>
      p.isActive &&
      p.module.isActive &&
      p.module.name === MODULES.ROLES &&
      p.canRead &&
      p.canUpdate &&
      p.canDelete
  );
}

/**
 * Indica si el rol otorga cualquier capacidad de escritura sobre el módulo "Roles".
 */
export function hasRoleManagementWriteAccess(role: PolicyRoleRecord): boolean {
  if (!role.isActive) return false;
  return role.permissions.some(
    (p) =>
      p.isActive &&
      p.module.isActive &&
      p.module.name === MODULES.ROLES &&
      p.canRead &&
      (p.canCreate || p.canUpdate || p.canDelete)
  );
}

/**
 * Resuelve los roles activos efectivos de un usuario manteniendo paridad exacta con
 * `getPermissionsForUser` (`UserRole` activos, con fallback a `initialRole` solo cuando
 * el usuario no tiene ningún vínculo activo en `UserRole`).
 */
export function resolveUserEffectiveActiveRoles(
  user: PolicyUserRecord,
  activeRolesByLowerName: Map<string, PolicyRoleRecord>
): PolicyRoleRecord[] {
  if (!user.isActive) return [];

  const fromUserRoles: PolicyRoleRecord[] = [];
  const seenIds = new Set<string>();

  for (const ur of user.userRoles) {
    if (!ur.role.isActive) continue;
    if (seenIds.has(ur.role.id)) continue;
    const fullRole =
      Array.from(activeRolesByLowerName.values()).find((r) => r.id === ur.role.id) ?? {
        id: ur.role.id,
        condominiumId: user.condominiumId,
        legacyIdGral: 0,
        name: ur.role.name,
        description: null,
        isActive: ur.role.isActive,
        permissions: [],
      };
    seenIds.add(fullRole.id);
    fromUserRoles.push(fullRole);
  }

  if (fromUserRoles.length > 0) {
    return fromUserRoles;
  }

  const fallbackName = user.initialRole?.trim().toLowerCase();
  if (fallbackName) {
    const fallbackRole = activeRolesByLowerName.get(fallbackName);
    if (fallbackRole) {
      return [fallbackRole];
    }
  }

  return [];
}

/**
 * Evalúa el impacto y las salvaguardas de seguridad previas a desactivar un rol.
 * - Identifica todos los usuarios activos asignados al rol.
 * - Respeta usuarios multi-rol: si conservan al menos otro rol activo (o son `ADMIN`
 *   del sistema), no se desactiva su cuenta de usuario; únicamente pierden los
 *   permisos provenientes del rol desactivado.
 * - Impide dejar al sistema sin administradores activos.
 * - Impide que quien ejecuta la acción desactive su propio acceso administrativo.
 */
export function evaluateRoleDeactivationImpact(params: {
  targetRoleId: string;
  actingUserId: string;
  roles: PolicyRoleRecord[];
  users: PolicyUserRecord[];
}): { impact: RoleDeactivationImpact; userIdsToDeactivate: string[] } {
  const { targetRoleId, actingUserId, roles, users } = params;

  const targetRole = roles.find((r) => r.id === targetRoleId);
  if (!targetRole) {
    throw new Error("El rol seleccionado no existe en este condominio.");
  }

  const activePermissionsCount = targetRole.permissions.filter(
    (p) => p.isActive && p.module.isActive && (p.canRead || p.canCreate || p.canUpdate || p.canDelete)
  ).length;

  const activeRolesByLowerName = new Map<string, PolicyRoleRecord>();
  for (const r of roles) {
    if (r.isActive) {
      activeRolesByLowerName.set(r.name.trim().toLowerCase(), r);
    }
  }

  const actingUser = users.find((u) => u.id === actingUserId);
  if (!actingUser || !actingUser.isActive) {
    throw new Error("Tu sesión o cuenta de usuario ya no está activa.");
  }

  const actingUserRoles = resolveUserEffectiveActiveRoles(actingUser, activeRolesByLowerName);
  const actingCanExecute =
    actingUser.userType === "ADMIN" ||
    actingUserRoles.some((r) => canRoleAdministerRoles(r));

  if (!actingCanExecute) {
    throw new Error("No tienes permisos vigentes para bloquear o desactivar roles.");
  }

  const emptyImpactBase = {
    role: {
      id: targetRole.id,
      name: targetRole.name,
      description: targetRole.description,
      isActive: targetRole.isActive,
      activePermissionsCount,
    },
    isAdminRole: hasRoleManagementWriteAccess(targetRole),
  };

  if (!targetRole.isActive) {
    return {
      impact: {
        ...emptyImpactBase,
        canDeactivate: false,
        blockReason: "Este rol ya se encuentra desactivado.",
        assignedUsers: [],
        usersToDeactivateCount: 0,
        usersRetainedCount: 0,
        remainingActiveAdminsCount: 0,
      },
      userIdsToDeactivate: [],
    };
  }

  if (targetRole.legacyIdGral !== 0) {
    return {
      impact: {
        ...emptyImpactBase,
        canDeactivate: false,
        blockReason: "Este rol reservado del sistema no puede desactivarse desde el catálogo.",
        assignedUsers: [],
        usersToDeactivateCount: 0,
        usersRetainedCount: 0,
        remainingActiveAdminsCount: 0,
      },
      userIdsToDeactivate: [],
    };
  }

  const assignedUsers: AffectedRoleUser[] = [];
  const userIdsToDeactivate: string[] = [];

  for (const user of users) {
    if (!user.isActive) continue;
    const effectiveRoles = resolveUserEffectiveActiveRoles(user, activeRolesByLowerName);
    const hasTargetRole = effectiveRoles.some((r) => r.id === targetRole.id);
    if (!hasTargetRole) continue;

    const otherRoles = effectiveRoles.filter((r) => r.id !== targetRole.id);
    const otherActiveRoleNames = otherRoles.map((r) => r.name);

    let willBeDeactivated = false;
    let retentionReason: string | null = null;

    if (user.userType === "ADMIN") {
      willBeDeactivated = false;
      retentionReason = "Cuenta administrativa del sistema (ADMIN)";
    } else if (otherRoles.length > 0) {
      willBeDeactivated = false;
      retentionReason = `Conserva rol activo: ${otherActiveRoleNames.join(", ")}`;
    } else {
      willBeDeactivated = true;
      userIdsToDeactivate.push(user.id);
    }

    assignedUsers.push({
      id: user.id,
      fullName: resolveUserDisplayName(user),
      email: resolveUserEffectiveEmail(user),
      userType: user.userType,
      willBeDeactivated,
      otherActiveRoles: otherActiveRoleNames,
      retentionReason,
    });
  }

  assignedUsers.sort((a, b) => a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" }));

  const remainingActiveAdminsCount = users.filter((user) => {
    if (!user.isActive) return false;
    if (userIdsToDeactivate.includes(user.id)) return false;
    const effectiveRoles = resolveUserEffectiveActiveRoles(user, activeRolesByLowerName);
    return effectiveRoles.some((r) => r.id !== targetRole.id && canRoleAdministerRoles(r));
  }).length;

  let canDeactivate = true;
  let blockReason: string | null = null;

  if (hasRoleManagementWriteAccess(targetRole) && remainingActiveAdminsCount === 0) {
    canDeactivate = false;
    blockReason =
      "No es posible desactivar este rol porque dejaría al sistema sin ningún administrador activo con capacidad para gestionar roles.";
  }

  if (canDeactivate && actingUser.userType !== "ADMIN") {
    const actorHasTarget = actingUserRoles.some((r) => r.id === targetRole.id);
    if (actorHasTarget) {
      const actorRetainsAdminCapability = actingUserRoles.some(
        (r) => r.id !== targetRole.id && canRoleAdministerRoles(r)
      );
      if (!actorRetainsAdminCapability) {
        canDeactivate = false;
        blockReason =
          "No puedes desactivar este rol porque desactivaría tu propio acceso o te dejaría sin permisos para administrar el sistema.";
      }
    }
  }

  const usersToDeactivateCount = userIdsToDeactivate.length;
  const usersRetainedCount = assignedUsers.length - usersToDeactivateCount;

  return {
    impact: {
      ...emptyImpactBase,
      canDeactivate,
      blockReason,
      assignedUsers,
      usersToDeactivateCount,
      usersRetainedCount,
      remainingActiveAdminsCount,
    },
    userIdsToDeactivate,
  };
}

