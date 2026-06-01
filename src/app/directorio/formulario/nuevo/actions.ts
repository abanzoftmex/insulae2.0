"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import crypto from "crypto";

function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function createFullDirectoryContactAction(data: any) {
  try {
    const condominium = await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true },
    });

    if (!condominium) {
      return { ok: false, message: "No se encontró el condominio activo." };
    }

    const newUser = await prisma.user.create({
      data: {
        condominiumId: condominium.id,
        userType: data.userType,
        requiresInvoice: data.requiresInvoice,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        lastNamePaterno: data.lastNamePaterno || null,
        lastNameMaterno: data.lastNameMaterno || null,
        curp: data.curp || null,
        personalPhone: data.personalPhone || null,
        personalEmail: data.personalEmail || null,
        address: data.address || null,
        commercialName: data.commercialName || null,
        businessName: data.businessName || null,
        rfc: data.rfc || null,
        businessPhone: data.businessPhone || null,
        businessEmail: data.businessEmail || null,
        taxAddress: data.taxAddress || null,
        taxStatusPdfUrl: data.taxStatusPdfUrl || null,
        initialRole: data.initialRole || null,
        passwordHash: data.password ? hashSHA256(data.password) : null,
        isActive: true,
      },
    });

    revalidatePath("/directorio");
    return { ok: true, message: "Persona creada exitosamente.", id: newUser.id };
  } catch (error) {
    console.error("[createFullDirectoryContactAction] error", error);
    return { ok: false, message: "Ocurrió un error al crear la persona." };
  }
}
