/**
 * Acceso al portal de condóminos (minisitio).
 *
 * Un usuario solo puede entrar al minisitio si tiene asignado el rol "Solo Minisitio",
 * sin importar si es propietario, arrendatario o ambos. El rol viene del legacy
 * (ROLES_CONDOMINAL.idGral = 5) y se identifica por ese id general o por su nombre,
 * de modo que un cambio de nombre en el catálogo no rompa el acceso.
 */
import type { Prisma } from "@prisma/client";

export const MINISITIO_ROLE = {
  legacyIdGral: 5,
  name: "Solo Minisitio",
} as const;

export const MINISITIO_ACCESS_DENIED_MESSAGE =
  "Tu cuenta no tiene acceso al portal de condóminos. Contacta a la administración.";

/**
 * Solo el rol "Solo Minisitio", para vincularlo a una cuenta. No usar minisitioRoleWhere para
 * eso: también abarca Master y Dirección INSULAE, y el login le daba Master (todo el panel) al
 * propietario que entraba sin el rol, porque Master es el más antiguo.
 */
export function minisitioOnlyRoleWhere(condominiumId: string): Prisma.RoleWhereInput {
  return {
    condominiumId,
    isActive: true,
    OR: [{ legacyIdGral: MINISITIO_ROLE.legacyIdGral }, { name: { equals: MINISITIO_ROLE.name, mode: "insensitive" } }],
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
