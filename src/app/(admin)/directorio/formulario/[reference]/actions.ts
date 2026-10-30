"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { AccountGuardError, assertCanGrant, assertCanManageAccount } from "@/shared/application/auth/account-guards";
import { hashPassword } from "@/shared/application/auth/password-hash";

import { updateDirectoryContactUseCase } from "@/modules/directory";
import type { DirectoryContactParticipation } from "@/modules/directory/domain/directory";
import { prisma } from "@/shared/infrastructure/db/prisma";
import crypto from "crypto";

/** Campos que cambian con qué correo se entra a la cuenta o qué permisos tiene. */
const ACCESS_FIELDS = ["email", "personalEmail", "businessEmail", "userType", "initialRole", "apolfap", "registrationTypeCode"] as const;

const normalized = (value: unknown) => (typeof value === "string" ? value.trim() || null : (value ?? null));

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

export async function saveDirectoryContactAction(id: string, data: Partial<DirectoryContactParticipation>) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canUpdate");
    const targetId = cleanUserId(id);

    // Cambiar el correo o los permisos de una cuenta con acceso al panel, o dar el tipo ADMIN o
    // un rol que abre el panel, no se hace solo con el permiso del Directorio (account-guards.ts).
    const current = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, condominiumId: true, email: true, personalEmail: true, businessEmail: true, userType: true, initialRole: true, apolfap: true, registrationTypeCode: true },
    });
    // Sin usuario no se guarda nada: antes el guard se saltaba y el repositorio, que vuelve a
    // decodificar el id, escribía sobre la cuenta real (un id codificado dos veces).
    if (!current) return { ok: false, message: "No se encontró el contacto." };

    const changed = ACCESS_FIELDS.filter((field) => data[field] !== undefined && normalized(data[field]) !== normalized(current[field]));
    if (changed.length > 0) await assertCanManageAccount(current.id);
    await assertCanGrant({
      condominiumId: current.condominiumId,
      userType: changed.includes("userType") ? data.userType : undefined,
      initialRole: changed.includes("initialRole") ? data.initialRole : undefined,
    });

    // El formulario siempre manda initialRole y el repositorio borra y recrea los UserRole cuando
    // llega: si no cambió, no se manda, para no quitar roles (Master, "Solo Minisitio") sin querer.
    const payload = { ...data };
    if (!changed.includes("initialRole")) delete payload.initialRole;

    const res = await updateDirectoryContactUseCase.execute({ id: current.id, data: payload });
    return { ok: true, message: "Contacto actualizado correctamente.", idVq: res.idVq };
  } catch (error) {
    if (error instanceof AccountGuardError) return { ok: false, message: error.message };
    console.error("[saveDirectoryContactAction] failed", error);
    return { ok: false, message: "No se pudo actualizar el contacto." };
  }
}

export async function updatePasswordAction(id: string, passwordPlain: string) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canUpdate");
    const targetId = cleanUserId(id);
    await assertCanManageAccount(targetId);
    const password = (passwordPlain || "").trim();
    if (password.length < 8) return { ok: false, message: "La contraseña debe tener al menos 8 caracteres." };
    await prisma.user.update({
      where: { id: targetId },
      data: { passwordHash: await hashPassword(password) },
    });
    return { ok: true, message: "Contraseña actualizada correctamente." };
  } catch (error) {
    if (error instanceof AccountGuardError) return { ok: false, message: error.message };
    console.error("[updatePasswordAction] failed", error);
    return { ok: false, message: "No se pudo actualizar la contraseña." };
  }
}

function generateRandomPassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    password += chars[randomIndex];
  }
  return password;
}

export async function generateTemporaryPasswordAction(id: string) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canUpdate");
    const targetId = cleanUserId(id);
    await assertCanManageAccount(targetId);
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        condominium: true,
      },
    });

    if (!user) {
      return { ok: false, message: "Usuario no encontrado." };
    }

    const emailRecipient = user.email || user.personalEmail || user.businessEmail;
    if (!emailRecipient || emailRecipient.trim() === "") {
      return { ok: false, message: "El usuario no tiene ningún correo electrónico configurado." };
    }

    const tempPassword = generateRandomPassword();
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: targetId },
      data: { passwordHash },
    });

    const condominiumName = user.condominium?.name || "Insulae";
    const subject = `Contraseña provisional - Condominio ${condominiumName}`;
    
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8dbcc; border-radius: 8px; }
            .header { background-color: #1a4d3e; color: #ffffff; padding: 15px; text-align: center; border-radius: 6px 6px 0 0; }
            .content { padding: 20px; background-color: #faf8f5; }
            .password-box { font-family: monospace; font-size: 20px; font-weight: bold; background-color: #e2ede8; color: #1a4d3e; padding: 12px; text-align: center; margin: 20px 0; border-radius: 4px; border: 1px dashed #1a4d3e; letter-spacing: 2px; }
            .footer { font-size: 11px; color: #958172; text-align: center; margin-top: 20px; border-top: 1px solid #e8dbcc; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${condominiumName}</h2>
            </div>
            <div class="content">
              <p>Hola <strong>${user.firstName || ""} ${user.lastName || ""}</strong>,</p>
              <p>Se ha generado una contraseña provisional para tu acceso al sistema del condominio.</p>
              <div class="password-box">${tempPassword}</div>
              <p>Por motivos de seguridad, te recomendamos iniciar sesión con esta contraseña y cambiarla inmediatamente desde tu perfil de usuario.</p>
              <p>Saludos cordiales,<br>Administración de ${condominiumName}</p>
            </div>
            <div class="footer">
              Recibió este correo porque está registrado en el sistema condominal de ${condominiumName}. 
              Si hay un error en esta información o no solicitó este cambio, por favor póngase en contacto con la administración.
            </div>
          </div>
        </body>
      </html>
    `;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("[generateTemporaryPasswordAction] RESEND_API_KEY no configurado. Loggeando contraseña provisional en consola:", tempPassword);
      return {
        ok: true,
        message: `Contraseña provisional generada: "${tempPassword}". (El envío por correo está deshabilitado en desarrollo porque la variable RESEND_API_KEY no está configurada).`,
        password: tempPassword,
      };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: `Condominio ${condominiumName} <finanzas@valquirico.com>`,
      to: emailRecipient,
      subject,
      html: emailBody,
    });

    return {
      ok: true,
      message: `Contraseña provisional enviada a ${emailRecipient} correctamente.`,
      password: tempPassword,
    };
  } catch (error) {
    if (error instanceof AccountGuardError) return { ok: false, message: error.message };
    console.error("[generateTemporaryPasswordAction] failed", error);
    return { ok: false, message: "No se pudo generar ni enviar la contraseña provisional." };
  }
}

const defaultTypes = [
  { code: "8-01", description: "Condómino" },
  { code: "8-02", description: "Conyuge" },
  { code: "8-03", description: "Hijos" },
  { code: "8-04", description: "Familiares" },
  { code: "8-05", description: "Personal a cargo" },
  { code: "8-06", description: "Visitas" },
  { code: "8-80", description: "Autorización para arrendar" },
  { code: "8-70", description: "Arrendatario" },
  { code: "8-71", description: "Conyuge" },
  { code: "8-72", description: "Hijos" },
  { code: "8-73", description: "Familiares" },
  { code: "8-74", description: "Personal a cargo" },
  { code: "8-75", description: "Visitas" },
  { code: "8-76", description: "Mascotas" },
  { code: "8-77", description: "Autos" },
  { code: "8-88", description: "Autorización para arrendar" },
  { code: "8-61", description: "Arrendatario" },
  { code: "8-11", description: "Empleados" },
  { code: "8-12", description: "Visitas" },
];

async function ensureRegistrationTypesExist(condominiumId: string) {
  const count = await prisma.registrationType.count({
    where: { condominiumId, isActive: true },
  });
  if (count === 0) {
    await prisma.registrationType.createMany({
      data: defaultTypes.map((t) => ({
        condominiumId,
        code: t.code,
        description: t.description,
      })),
    });
  }
}

export async function getRegistrationTypesAction(condominiumId: string) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canRead");
    await ensureRegistrationTypesExist(condominiumId);
    const items = await prisma.registrationType.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { code: "asc" },
    });
    return { ok: true, data: items };
  } catch (error) {
    console.error("[getRegistrationTypesAction] failed", error);
    return { ok: false, data: [] };
  }
}

export async function addRegistrationTypeAction(condominiumId: string, description: string) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canCreate");
    await ensureRegistrationTypesExist(condominiumId);
    const existing = await prisma.registrationType.findMany({
      where: { condominiumId, isActive: true },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((e) => e.code));

    let index = 1;
    let nextCode = "";
    while (true) {
      nextCode = `8-${String(index).padStart(2, "0")}`;
      if (!existingCodes.has(nextCode)) {
        break;
      }
      index++;
    }

    const newItem = await prisma.registrationType.create({
      data: {
        condominiumId,
        code: nextCode,
        description,
      },
    });

    return { ok: true, data: newItem };
  } catch (error) {
    console.error("[addRegistrationTypeAction] failed", error);
    return { ok: false, message: "No se pudo agregar la descripción." };
  }
}

export async function updateRegistrationTypeAction(id: string, description: string) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canUpdate");
    await prisma.registrationType.update({
      where: { id },
      data: { description },
    });
    return { ok: true };
  } catch (error) {
    console.error("[updateRegistrationTypeAction] failed", error);
    return { ok: false, message: "No se pudo actualizar la descripción." };
  }
}

export async function deleteRegistrationTypeAction(id: string) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canDelete");
    await prisma.registrationType.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  } catch (error) {
    console.error("[deleteRegistrationTypeAction] failed", error);
    return { ok: false, message: "No se pudo eliminar la descripción." };
  }
}

export async function createNestedUserAction(
  parentId: string,
  data: {
    firstName: string;
    lastNamePaterno?: string;
    lastNameMaterno?: string;
    curp?: string;
    personalPhone?: string;
    personalEmail?: string;
    birthDate?: string;
    gender?: string;
    registrationTypeCode: string;
    registrationTypeDesc: string;
    apolfap?: string;
  }
) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canCreate");
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
      select: { idVq: true, apolfap: true, condominiumId: true }
    });

    if (!parent) {
      return { ok: false, message: "No se encontró el usuario principal." };
    }

    const parentIdVq = parent.idVq || "#000";
    const code = data.registrationTypeCode || "8-99";

    // Query active siblings (children of this parent)
    const siblings = await prisma.user.findMany({
      where: {
        parentId,
        isActive: true,
      },
      select: { idVq: true, registrationTypeCode: true }
    });

    const prefix = `${parentIdVq}-${code}-`;
    const usedSuffixes = new Set<number>();
    for (const sib of siblings) {
      if (sib.idVq && sib.idVq.startsWith(prefix)) {
        const suffixStr = sib.idVq.substring(prefix.length);
        const val = parseInt(suffixStr, 10);
        if (!isNaN(val)) {
          usedSuffixes.add(val);
        }
      }
    }

    let nextSuffix = 1;
    while (usedSuffixes.has(nextSuffix)) {
      nextSuffix++;
    }

    const generatedIdVq = `${parentIdVq}-${code}-${nextSuffix}`;

    const targetApol = (data.apolfap || parent.apolfap || "").trim();
    let computedChildEmail = null;
    if (targetApol && generatedIdVq) {
      computedChildEmail = `ID-${targetApol}${generatedIdVq.trim()}`;
    }

    const newChild = await prisma.user.create({
      data: {
        condominiumId: parent.condominiumId,
        parentId,
        idVq: generatedIdVq,
        apolfap: targetApol || null,
        userType: "INDIVIDUAL",
        firstName: data.firstName || null,
        lastName: `${data.lastNamePaterno || ""} ${data.lastNameMaterno || ""}`.trim() || null,
        lastNamePaterno: data.lastNamePaterno || null,
        lastNameMaterno: data.lastNameMaterno || null,
        curp: data.curp || null,
        personalPhone: data.personalPhone || null,
        personalEmail: data.personalEmail || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender || null,
        registrationTypeCode: data.registrationTypeCode || null,
        registrationTypeDesc: data.registrationTypeDesc || null,
        email: computedChildEmail,
        isActive: true,
      }
    });

    return { ok: true, message: "Usuario anidado creado con éxito.", data: newChild };
  } catch (error) {
    console.error("[createNestedUserAction] failed", error);
    return { ok: false, message: "No se pudo crear el usuario anidado." };
  }
}

export async function deleteNestedUserAction(id: string) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canDelete");
    // Solo usuarios anidados, y no los que tienen acceso al panel: antes servía para desactivar
    // cualquier cuenta, administradores incluidos.
    const nested = await prisma.user.findUnique({ where: { id }, select: { parentId: true } });
    if (!nested?.parentId) return { ok: false, message: "Solo se pueden eliminar usuarios anidados." };
    await assertCanManageAccount(id);
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    return { ok: true, message: "Usuario anidado eliminado correctamente." };
  } catch (error) {
    if (error instanceof AccountGuardError) return { ok: false, message: error.message };
    console.error("[deleteNestedUserAction] failed", error);
    return { ok: false, message: "No se pudo eliminar el usuario anidado." };
  }
}

export async function unlinkCommerceFromPersonAction(userCommerceId: string) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canUpdate");
    await prisma.userCommerce.update({
      where: { id: userCommerceId },
      data: { isActive: false }
    });
    return { ok: true, message: "Comercio desvinculado de la persona correctamente." };
  } catch (error) {
    console.error("[unlinkCommerceFromPersonAction] failed", error);
    return { ok: false, message: "No se pudo desvincular el comercio." };
  }
}

export interface SaveCommerceInput {
  userId: string;
  userCommerceId?: string | null;
  commerceId?: string | null;
  name: string;
  businessName?: string | null;
  rfc?: string | null;
  phone?: string | null;
  email?: string | null;
  administrativeContactUserId?: string | null;
  operativeContactUserId?: string | null;
}

export async function saveCommerceForPersonAction(data: SaveCommerceInput) {
  try {
    await assertPermission(MODULES.DIRECTORIO, "canUpdate");
    const targetUserId = cleanUserId(data.userId);

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { condominiumId: true }
    });

    if (!user) {
      return { ok: false, message: "Usuario no encontrado." };
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { ok: false, message: "El nombre comercial es obligatorio." };
    }

    let targetCommerceId = data.commerceId ?? null;

    // 1. If commerceId exists, update the Commerce entity
    if (targetCommerceId) {
      await prisma.commerce.update({
        where: { id: targetCommerceId },
        data: {
          name: trimmedName,
          businessName: data.businessName?.trim() || null,
          rfc: data.rfc?.trim() || null,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          administrativeContactUserId: data.administrativeContactUserId || null,
          operativeContactUserId: data.operativeContactUserId || null,
        }
      });
    } else {
      // Check if commerce already exists with this name
      const existing = await prisma.commerce.findFirst({
        where: {
          condominiumId: user.condominiumId,
          name: { equals: trimmedName, mode: "insensitive" }
        }
      });

      if (existing) {
        targetCommerceId = existing.id;
        await prisma.commerce.update({
          where: { id: existing.id },
          data: {
            businessName: data.businessName?.trim() || existing.businessName,
            rfc: data.rfc?.trim() || existing.rfc,
            phone: data.phone?.trim() || existing.phone,
            email: data.email?.trim() || existing.email,
            administrativeContactUserId: data.administrativeContactUserId !== undefined 
              ? data.administrativeContactUserId 
              : existing.administrativeContactUserId,
            operativeContactUserId: data.operativeContactUserId !== undefined 
              ? data.operativeContactUserId 
              : existing.operativeContactUserId,
          }
        });
      } else {
        const newCommerce = await prisma.commerce.create({
          data: {
            condominiumId: user.condominiumId,
            name: trimmedName,
            businessName: data.businessName?.trim() || null,
            rfc: data.rfc?.trim() || null,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            administrativeContactUserId: data.administrativeContactUserId || null,
            operativeContactUserId: data.operativeContactUserId || null,
            isActive: true,
          }
        });
        targetCommerceId = newCommerce.id;
      }
    }

    // 2. Link or update UserCommerce
    if (data.userCommerceId) {
      await prisma.userCommerce.update({
        where: { id: data.userCommerceId },
        data: {
          commerceName: trimmedName,
          commerceId: targetCommerceId,
          isActive: true,
        }
      });
    } else {
      // Find if UserCommerce already exists for this user and commerce
      const existingUC = await prisma.userCommerce.findFirst({
        where: {
          userId: targetUserId,
          OR: [
            { commerceId: targetCommerceId },
            { commerceName: { equals: trimmedName, mode: "insensitive" } }
          ]
        }
      });

      if (existingUC) {
        await prisma.userCommerce.update({
          where: { id: existingUC.id },
          data: {
            commerceName: trimmedName,
            commerceId: targetCommerceId,
            isActive: true,
          }
        });
      } else {
        const count = await prisma.userCommerce.count({ where: { userId: targetUserId } });
        await prisma.userCommerce.create({
          data: {
            condominiumId: user.condominiumId,
            userId: targetUserId,
            commerceId: targetCommerceId,
            commerceName: trimmedName,
            sortOrder: count + 1,
            isActive: true,
          }
        });
      }
    }

    return { ok: true, message: "Comercio guardado y vinculado correctamente." };
  } catch (error) {
    console.error("[saveCommerceForPersonAction] failed", error);
    return { ok: false, message: "No se pudo guardar el comercio." };
  }
}



