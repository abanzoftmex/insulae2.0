"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

import { revalidatePath } from "next/cache";
import { minisitioOnlyRoleWhere } from "@/shared/application/auth/condomino-access";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import crypto from "crypto";

function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function createFullDirectoryContactAction(data: any) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canCreate");
    const condominium = await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true },
    });

    if (!condominium) {
      return { ok: false, message: "No se encontró el condominio activo." };
    }

    const siblings = await prisma.user.findMany({
      where: {
        condominiumId: condominium.id,
        isActive: true,
        idVq: { startsWith: "#" },
      },
      select: { idVq: true },
    });

    const usedNumbers = new Set(
      siblings
        .map((s) => {
          if (!s.idVq) return null;
          const numStr = s.idVq.replace("#", "");
          const val = parseInt(numStr, 10);
          return isNaN(val) ? null : val;
        })
        .filter((val): val is number => val !== null)
    );

    let nextNum = 1;
    while (usedNumbers.has(nextNum)) {
      nextNum++;
    }

    const generatedIdVq = `#${String(nextNum).padStart(3, "0")}`;

    const adminRoleId = typeof data.adminRoleId === "string" ? data.adminRoleId.trim() : "";
    const grantExplicitMinisitio = Boolean(data.grantExplicitMinisitio);

    let validatedAdminRole: { id: string; name: string } | null = null;
    if (adminRoleId) {
      validatedAdminRole = await prisma.role.findFirst({
        where: {
          id: adminRoleId,
          condominiumId: condominium.id,
          isActive: true,
          legacyIdGral: 0,
          NOT: { name: { equals: "Solo Minisitio", mode: "insensitive" } },
        },
        select: { id: true, name: true },
      });
      if (!validatedAdminRole) {
        return {
          ok: false,
          message: "El rol seleccionado no es un rol administrativo válido del condominio.",
        };
      }
    }

    const soloMinisitioRole = grantExplicitMinisitio
      ? await prisma.role.findFirst({
          where: minisitioOnlyRoleWhere(condominium.id),
          orderBy: [{ legacyIdGral: "desc" }, { createdAt: "asc" }],
          select: { id: true, name: true },
        })
      : null;

    if (grantExplicitMinisitio && !soloMinisitioRole) {
      return {
        ok: false,
        message: "No se encontró el rol reservado «Solo Minisitio» activo en el condominio.",
      };
    }

    const derivedInitialRole =
      validatedAdminRole?.name ?? (soloMinisitioRole ? soloMinisitioRole.name : null);

    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          condominiumId: condominium.id,
          idVq: generatedIdVq,
          userType: data.userType,
          requiresInvoice: data.requiresInvoice,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          lastNamePaterno: data.lastNamePaterno || null,
          lastNameMaterno: data.lastNameMaterno || null,
          curp: data.curp || null,
          personalPhone: data.personalPhone || null,
          email: data.personalEmail || null,
          personalEmail: data.personalEmail || null,
          address: data.address || null,
          commercialName: data.commercialName || null,
          businessName: data.businessName || null,
          rfc: data.rfc || null,
          businessPhone: data.businessPhone || null,
          businessEmail: data.businessEmail || null,
          taxAddress: data.taxAddress || null,
          taxStatusPdfUrl: data.taxStatusPdfUrl || null,
          initialRole: derivedInitialRole,
          passwordHash: data.password ? hashSHA256(data.password) : null,
          isActive: true,
        },
      });

      const roleIdsToAssign = [
        ...(validatedAdminRole ? [validatedAdminRole.id] : []),
        ...(soloMinisitioRole ? [soloMinisitioRole.id] : []),
      ];

      if (roleIdsToAssign.length > 0) {
        await tx.userRole.createMany({
          data: [...new Set(roleIdsToAssign)].map((roleId) => ({
            userId: created.id,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    revalidatePath("/directorio");
    return { ok: true, message: "Persona creada exitosamente.", id: newUser.id };
  } catch (error) {
    console.error("[createFullDirectoryContactAction] error", error);
    return { ok: false, message: "Ocurrió un error al crear la persona." };
  }
}
