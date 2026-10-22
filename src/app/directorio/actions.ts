"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { readAdminSession } from "@/shared/application/auth/permissions";
import { prisma } from "@/shared/infrastructure/db/prisma";

export interface PersonRelationsSummary {
  ok: boolean;
  message?: string;
  person?: {
    id: string;
    fullName: string;
    businessName: string | null;
    email: string | null;
    phone: string | null;
    rfc: string | null;
    hasCredentials: boolean;
    hasAdminRoles: boolean;
    roles: string[];
  };
  hasRelations: boolean;
  relations: {
    privateAreas: Array<{
      id: string;
      name: string;
      role: string;
    }>;
    commerces: Array<{
      id: string;
      name: string;
      relationType: string;
    }>;
    rentals: Array<{
      id: string;
      areaName: string;
      relationType: string;
    }>;
    nestedUsers: Array<{
      id: string;
      fullName: string;
      roleDesc: string;
    }>;
    structurePositions: Array<{
      title: string;
    }>;
  };
}

function cleanUserId(id: string): string {
  let decoded = id.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // ignore
  }
  if (decoded.includes(":commerce:")) {
    return decoded.split(":commerce:")[0] ?? decoded;
  }
  return decoded.split(":")[0] ?? decoded;
}

/**
 * Consulta en tiempo real las relaciones reales de una persona antes de proceder con su eliminación.
 * Identifica áreas privativas, comercios, arrendamientos, usuarios anidados y roles asignados.
 */
export async function getPersonRelationsForDeletionAction(
  personId: string
): Promise<PersonRelationsSummary> {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canDelete");

    const targetUserId = cleanUserId(personId);
    if (!targetUserId) {
      return {
        ok: false,
        message: "Identificador de persona inválido.",
        hasRelations: false,
        relations: {
          privateAreas: [],
          commerces: [],
          rentals: [],
          nestedUsers: [],
          structurePositions: [],
        },
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        condominiumId: true,
        userType: true,
        businessName: true,
        commercialName: true,
        firstName: true,
        lastName: true,
        email: true,
        personalEmail: true,
        businessEmail: true,
        phone: true,
        personalPhone: true,
        businessPhone: true,
        rfc: true,
        passwordHash: true,
        isActive: true,
        initialRole: true,
        userRoles: {
          where: { role: { isActive: true } },
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        assignments: {
          where: {
            isActive: true,
            privateArea: { isActive: true },
          },
          select: {
            id: true,
            roleName: true,
            privateArea: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        commerces: {
          where: { isActive: true },
          select: {
            id: true,
            commerceName: true,
          },
        },
        administrativeCommerces: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
          },
        },
        operativeCommerces: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
          },
        },
        rentalsAsAdministrativeContact: {
          where: { privateArea: { isActive: true } },
          select: {
            id: true,
            privateArea: {
              select: {
                name: true,
              },
            },
          },
        },
        rentalsAsOperativeContact: {
          where: { privateArea: { isActive: true } },
          select: {
            id: true,
            privateArea: {
              select: {
                name: true,
              },
            },
          },
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationTypeDesc: true,
            registrationTypeCode: true,
          },
        },
        structurePositionAssignments: {
          where: { isActive: true },
          select: {
            position: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return {
        ok: false,
        message: "La persona no fue encontrada o ya está inactiva.",
        hasRelations: false,
        relations: {
          privateAreas: [],
          commerces: [],
          rentals: [],
          nestedUsers: [],
          structurePositions: [],
        },
      };
    }

    // 1. Áreas privativas asignadas
    const privateAreas = user.assignments.map((a) => ({
      id: a.privateArea.id,
      name: a.privateArea.name,
      role: a.roleName || "Asignación activa",
    }));

    // 2. Comercios vinculados
    const commerceMap = new Map<string, { id: string; name: string; relationType: string }>();

    for (const c of user.commerces) {
      commerceMap.set(c.id, {
        id: c.id,
        name: c.commerceName,
        relationType: "Comercio registrado",
      });
    }

    for (const ac of user.administrativeCommerces) {
      if (!commerceMap.has(ac.id)) {
        commerceMap.set(ac.id, {
          id: ac.id,
          name: ac.name || "Comercio sin nombre",
          relationType: "Contacto administrativo",
        });
      }
    }

    for (const oc of user.operativeCommerces) {
      if (!commerceMap.has(oc.id)) {
        commerceMap.set(oc.id, {
          id: oc.id,
          name: oc.name || "Comercio sin nombre",
          relationType: "Contacto operativo",
        });
      }
    }

    const commerces = Array.from(commerceMap.values());

    // 3. Arrendamientos (como contacto o tenantName)
    const rentalList: Array<{ id: string; areaName: string; relationType: string }> = [];

    for (const r of user.rentalsAsAdministrativeContact) {
      rentalList.push({
        id: r.id,
        areaName: r.privateArea.name,
        relationType: "Contacto administrativo",
      });
    }

    for (const r of user.rentalsAsOperativeContact) {
      if (!rentalList.some((existing) => existing.id === r.id)) {
        rentalList.push({
          id: r.id,
          areaName: r.privateArea.name,
          relationType: "Contacto operativo",
        });
      }
    }

    const namesToMatch = [
      user.businessName?.trim(),
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      user.commercialName?.trim(),
    ].filter(Boolean) as string[];

    if (namesToMatch.length > 0) {
      const rentalsByTenant = await prisma.rental.findMany({
        where: {
          condominiumId: user.condominiumId,
          OR: namesToMatch.map((n) => ({
            tenantName: { equals: n, mode: "insensitive" },
          })),
          privateArea: { isActive: true },
        },
        select: {
          id: true,
          privateArea: { select: { name: true } },
        },
      });

      for (const r of rentalsByTenant) {
        if (!rentalList.some((existing) => existing.id === r.id)) {
          rentalList.push({
            id: r.id,
            areaName: r.privateArea.name,
            relationType: "Arrendatario",
          });
        }
      }
    }

    // 4. Usuarios anidados
    const nestedUsers = user.children.map((child) => ({
      id: child.id,
      fullName: `${child.firstName ?? ""} ${child.lastName ?? ""}`.trim() || "Sin nombre",
      roleDesc: child.registrationTypeDesc || child.registrationTypeCode || "Usuario anidado",
    }));

    // 5. Puestos de estructura
    const structurePositions = user.structurePositionAssignments.map((spa) => ({
      title: spa.position.name,
    }));

    const roles = user.userRoles.map((ur) => ur.role.name);
    if (user.initialRole && !roles.includes(user.initialRole)) {
      roles.push(user.initialRole);
    }

    const hasRelations =
      privateAreas.length > 0 ||
      commerces.length > 0 ||
      rentalList.length > 0 ||
      nestedUsers.length > 0 ||
      structurePositions.length > 0;

    const fullName =
      user.businessName?.trim() ||
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      user.email ||
      "Sin nombre";

    return {
      ok: true,
      person: {
        id: user.id,
        fullName,
        businessName: user.businessName,
        email: user.email || user.personalEmail || user.businessEmail,
        phone: user.phone || user.personalPhone || user.businessPhone,
        rfc: user.rfc,
        hasCredentials: !!user.passwordHash,
        hasAdminRoles: roles.length > 0,
        roles,
      },
      hasRelations,
      relations: {
        privateAreas,
        commerces,
        rentals: rentalList,
        nestedUsers,
        structurePositions,
      },
    };
  } catch (error: any) {
    console.error("[getPersonRelationsForDeletionAction] Error:", error);
    return {
      ok: false,
      message: error?.message || "Error al consultar relaciones de la persona.",
      hasRelations: false,
      relations: {
        privateAreas: [],
        commerces: [],
        rentals: [],
        nestedUsers: [],
        structurePositions: [],
      },
    };
  }
}

/**
 * Elimina de manera segura a una persona del Directorio dentro de una transacción.
 * - Desvincula asignaciones de áreas privativas (pasan a "sin asignar" si no tienen otras personas).
 * - Conserva íntegras las áreas privativas, comercios y registros financieros (cargos, pagos, documentos).
 * - Desvincula comercios y contactos administrativos/operativos.
 * - Da de baja usuarios anidados dependientes.
 * - Revoca credenciales de acceso y roles en el sistema para evitar accesos indebidos.
 */
export async function deleteDirectoryPersonAction(
  personId: string
): Promise<{ ok: boolean; message: string }> {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canDelete");

    const targetUserId = cleanUserId(personId);
    if (!targetUserId) {
      return { ok: false, message: "Identificador de persona inválido." };
    }

    // Evitar que el usuario actual se elimine a sí mismo
    const session = await readAdminSession();
    if (session && session.userId === targetUserId) {
      return {
        ok: false,
        message: "No puedes eliminar tu propio usuario mientras mantienes la sesión activa.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          condominiumId: true,
          businessName: true,
          firstName: true,
          lastName: true,
          commercialName: true,
          isActive: true,
          assignments: {
            where: { isActive: true },
            select: { id: true, privateAreaId: true },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new Error("La persona no existe o ya ha sido eliminada.");
      }

      // 1. Desvincular asignaciones de áreas privativas
      const affectedAreaIds = [...new Set(user.assignments.map((a) => a.privateAreaId))];

      await tx.residentAssignment.updateMany({
        where: {
          userId: targetUserId,
          isActive: true,
        },
        data: {
          isActive: false,
          endsAt: new Date(),
        },
      });

      // Si el área se queda sin asignaciones activas, se actualiza su estado a UNASSIGNED
      for (const areaId of affectedAreaIds) {
        const remainingCount = await tx.residentAssignment.count({
          where: {
            privateAreaId: areaId,
            isActive: true,
          },
        });
        if (remainingCount === 0) {
          await tx.privateArea.update({
            where: { id: areaId },
            data: { status: "UNASSIGNED" },
          });
        }
      }

      // 2. Desvincular contactos y tenant en Rentals
      await tx.rental.updateMany({
        where: { administrativeContactUserId: targetUserId },
        data: { administrativeContactUserId: null },
      });

      await tx.rental.updateMany({
        where: { operativeContactUserId: targetUserId },
        data: { operativeContactUserId: null },
      });

      const namesToMatch = [
        user.businessName?.trim(),
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        user.commercialName?.trim(),
      ].filter(Boolean) as string[];

      if (namesToMatch.length > 0) {
        await tx.rental.updateMany({
          where: {
            condominiumId: user.condominiumId,
            OR: namesToMatch.map((n) => ({
              tenantName: { equals: n, mode: "insensitive" },
            })),
          },
          data: {
            tenantName: null,
          },
        });
      }

      // 3. Desvincular contactos en Comercios y desactivar UserCommerces
      await tx.commerce.updateMany({
        where: { administrativeContactUserId: targetUserId },
        data: { administrativeContactUserId: null },
      });

      await tx.commerce.updateMany({
        where: { operativeContactUserId: targetUserId },
        data: { operativeContactUserId: null },
      });

      await tx.userCommerce.updateMany({
        where: { userId: targetUserId, isActive: true },
        data: { isActive: false },
      });

      // 4. Desactivar usuarios anidados dependientes
      await tx.user.updateMany({
        where: { parentId: targetUserId, isActive: true },
        data: {
          isActive: false,
          passwordHash: null,
          initialRole: null,
        },
      });

      // 5. Revocar roles administrativos y puestos en la estructura
      await tx.userRole.deleteMany({
        where: { userId: targetUserId },
      });

      await tx.condominiumStructurePositionAssignment.deleteMany({
        where: { userId: targetUserId },
      });

      // 6. Eliminar la persona del directorio y revocar accesos
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          isActive: false,
          passwordHash: null,
          initialRole: null,
        },
      });
    });

    revalidatePath("/directorio");
    revalidatePath("/areas-privativas");

    return {
      ok: true,
      message: "Persona eliminada correctamente del directorio.",
    };
  } catch (error: any) {
    console.error("[deleteDirectoryPersonAction] Error:", error);
    return {
      ok: false,
      message: error?.message || "Ocurrió un error al eliminar a la persona.",
    };
  }
}
