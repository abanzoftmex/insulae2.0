/**
 * Acceso al portal de condóminos (minisitio) y clasificación de roles reservados.
 *
 * Un usuario tiene acceso legítimo al minisitio si está activo en el condominio y cumple
 * al menos una de las siguientes vías:
 * - `userType = ADMIN`
 * - Tiene un rol reconocido por `minisitioRoleWhere` ("Solo Minisitio", "Condómino", "Master", "Dirección INSULAE")
 * - Tiene al menos una `ResidentAssignment` activa sobre un área privativa activa
 * - Es contacto administrativo u operativo de un `Rental` activo y vigente en área activa
 */
import type { Prisma } from "@prisma/client";

export const MINISITIO_ROLE = {
  legacyIdGral: 5,
  name: "Solo Minisitio",
} as const;

export const MINISITIO_ACCESS_DENIED_MESSAGE =
  "Tu cuenta no tiene acceso al portal de condóminos. Contacta a la administración.";

/** Estatus válidos de un contrato de arrendamiento activo en Insulae 2.0 (legacy "1" o texto). */
export const ACTIVE_RENTAL_STATUSES = ["1", "ACTIVE", "ACTIVO"] as const;

export function normalizeRoleLabel(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isRentalStatusActive(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toUpperCase();
  return (ACTIVE_RENTAL_STATUSES as readonly string[]).includes(normalized);
}

/** Determina si un rol administrativo (`legacyIdGral === 0`) también habilita el minisitio. */
export function isAdminPanelMinisitioRole(
  roleName: string | null | undefined,
  legacyIdGral?: number | null,
): boolean {
  if ((legacyIdGral ?? 0) !== 0) return false;
  const normalized = normalizeRoleLabel(roleName);
  return normalized === "master" || normalized === "direccion insulae";
}

/** Filtro Prisma de asignaciones residenciales activas en áreas privativas activas. */
export function activeResidentAssignmentWhere(condominiumId: string): Prisma.ResidentAssignmentWhereInput {
  return {
    condominiumId,
    isActive: true,
    privateArea: { isActive: true },
  };
}

/** Filtro Prisma de arrendamientos activos/vigentes en áreas privativas activas. */
export function activeRentalWhere(condominiumId: string): Prisma.RentalWhereInput {
  return {
    condominiumId,
    privateArea: { isActive: true },
    OR: ACTIVE_RENTAL_STATUSES.map((status) => ({
      status: { equals: status, mode: "insensitive" },
    })),
  };
}

/**
 * Solo el rol "Solo Minisitio", para vincularlo o desvincularlo de una cuenta.
 * Nunca usar `minisitioRoleWhere` para vincular roles: también abarca Master y Dirección INSULAE.
 */
export function minisitioOnlyRoleWhere(condominiumId: string): Prisma.RoleWhereInput {
  return {
    condominiumId,
    isActive: true,
    OR: [
      { legacyIdGral: MINISITIO_ROLE.legacyIdGral },
      { name: { equals: MINISITIO_ROLE.name, mode: "insensitive" } },
    ],
  };
}

/** Filtro Prisma de los roles que dan acceso al minisitio dentro de un condominio. */
export function minisitioRoleWhere(condominiumId: string): Prisma.RoleWhereInput {
  return {
    condominiumId,
    isActive: true,
    OR: [
      { legacyIdGral: MINISITIO_ROLE.legacyIdGral },
      { name: { equals: MINISITIO_ROLE.name, mode: "insensitive" } },
      { name: { equals: "Condómino", mode: "insensitive" } },
      { name: { equals: "Master", mode: "insensitive" } },
      { name: { equals: "Dirección INSULAE", mode: "insensitive" } },
      { description: { contains: "Solo Minisitio", mode: "insensitive" } },
    ],
  };
}

/**
 * Criterio unificado de elegibilidad de usuario para el portal de condóminos (login,
 * validación de sesión y recuperación de contraseña). No otorga permisos administrativos.
 */
export function minisitioEligibleUserWhere(condominiumId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { userType: "ADMIN" },
      { userRoles: { some: { role: minisitioRoleWhere(condominiumId) } } },
      { assignments: { some: activeResidentAssignmentWhere(condominiumId) } },
      { rentalsAsAdministrativeContact: { some: activeRentalWhere(condominiumId) } },
      { rentalsAsOperativeContact: { some: activeRentalWhere(condominiumId) } },
    ],
  };
}
