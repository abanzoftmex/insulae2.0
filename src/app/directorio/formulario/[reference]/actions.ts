"use server";

import { updateDirectoryContactUseCase } from "@/modules/directory";
import type { DirectoryContactParticipation } from "@/modules/directory/domain/directory";
import { prisma } from "@/shared/infrastructure/db/prisma";
import crypto from "crypto";

export async function saveDirectoryContactAction(id: string, data: Partial<DirectoryContactParticipation>) {
  try {
    const res = await updateDirectoryContactUseCase.execute({ id, data });
    return { ok: true, message: "Contacto actualizado correctamente.", idVq: res.idVq };
  } catch (error) {
    console.error("[saveDirectoryContactAction] failed", error);
    return { ok: false, message: "No se pudo actualizar el contacto." };
  }
}

function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function updatePasswordAction(id: string, passwordPlain: string) {
  try {
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashSHA256(passwordPlain) },
    });
    return { ok: true, message: "Contraseña actualizada correctamente." };
  } catch (error) {
    console.error("[updatePasswordAction] failed", error);
    return { ok: false, message: "No se pudo actualizar la contraseña." };
  }
}

function generateRandomPassword(length = 8): string {
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
    const user = await prisma.user.findUnique({
      where: { id },
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

    const tempPassword = generateRandomPassword(8);
    const passwordHash = hashSHA256(tempPassword);

    await prisma.user.update({
      where: { id },
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
      from: `Condominio ${condominiumName} <soporte@insulae.sistemasabanza.com>`,
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
  data: { firstName: string; lastName: string; registrationTypeCode: string; registrationTypeDesc: string }
) {
  try {
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
      select: { idVq: true, condominiumId: true }
    });

    if (!parent) {
      return { ok: false, message: "No se encontró el usuario principal." };
    }

    const parentIdVq = parent.idVq || "#000";

    // Query active siblings (children of this parent)
    const siblings = await prisma.user.findMany({
      where: {
        parentId,
        isActive: true,
      },
      select: { idVq: true }
    });

    // Extract numerical suffixes, e.g. from "#001-1" -> 1
    const prefix = `${parentIdVq}-`;
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

    const generatedIdVq = `${parentIdVq}-${nextSuffix}`;

    const newChild = await prisma.user.create({
      data: {
        condominiumId: parent.condominiumId,
        parentId,
        idVq: generatedIdVq,
        userType: "INDIVIDUAL",
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        registrationTypeCode: data.registrationTypeCode || null,
        registrationTypeDesc: data.registrationTypeDesc || null,
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
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    return { ok: true, message: "Usuario anidado eliminado correctamente." };
  } catch (error) {
    console.error("[deleteNestedUserAction] failed", error);
    return { ok: false, message: "No se pudo eliminar el usuario anidado." };
  }
}


