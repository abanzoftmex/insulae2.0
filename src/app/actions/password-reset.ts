"use server";

/**
 * Recuperación de contraseña del panel administrativo.
 *
 * 1. `requestPasswordResetAction(email, origin)`: si existe un usuario activo con ese correo y
 *    con acceso al panel, firma un token de 1 hora y envía el enlace por correo (Resend, vía
 *    API REST para no depender del SDK). Siempre responde igual: no revela si el correo existe.
 * 2. `resetPasswordWithTokenAction(token, newPassword)`: valida el token y fija la contraseña
 *    con SHA-256, el estándar del login.
 */
import crypto from "crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { signAdminResetToken, verifyAdminResetToken } from "@/shared/application/auth/admin-session";
import { canAccessAdminPanel, getPermissionsForUser } from "@/shared/application/auth/permissions";

const GENERIC_OK =
  "Si el correo está registrado y tiene acceso al panel, recibirás un enlace para restablecer tu contraseña.";

export async function requestPasswordResetAction(
  emailInput: string,
  origin: string,
): Promise<{ success: boolean; message: string }> {
  const email = (emailInput || "").trim();
  if (!email) return { success: false, message: "Ingresa tu correo." };

  try {
    const candidates = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { personalEmail: { equals: email, mode: "insensitive" } },
          { businessEmail: { equals: email, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, userType: true, condominium: { select: { name: true } } },
    });

    // Un correo puede compartirse entre varias cuentas (dato legacy): elegimos la que tenga acceso al panel.
    let target: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      const perms = await getPermissionsForUser(candidate.id);
      if (candidate.userType === "ADMIN" || canAccessAdminPanel(perms)) {
        target = candidate;
        break;
      }
    }
    if (!target) return { success: true, message: GENERIC_OK };

    const token = await signAdminResetToken(target.id);
    const safeOrigin = /^https?:\/\/[^/\s]+$/.test(origin) ? origin : "";
    const resetLink = `${safeOrigin}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
    const name = [target.firstName, target.lastName].filter(Boolean).join(" ") || "usuario";
    const condominiumName = target.condominium?.name || "Insulae";

    await sendResetEmail({ to: email, name, condominiumName, resetLink });
    return { success: true, message: GENERIC_OK };
  } catch (error) {
    console.error("[requestPasswordResetAction] error", error);
    return { success: false, message: "No se pudo procesar la solicitud. Inténtalo más tarde." };
  }
}

export async function resetPasswordWithTokenAction(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  const payload = await verifyAdminResetToken(token);
  if (!payload) {
    return { success: false, message: "El enlace es inválido o expiró. Solicita uno nuevo." };
  }
  const password = (newPassword || "").trim();
  if (password.length < 8) {
    return { success: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) {
      return { success: false, message: "La cuenta no existe o está inactiva." };
    }
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    return { success: true, message: "Contraseña actualizada. Ya puedes iniciar sesión." };
  } catch (error) {
    console.error("[resetPasswordWithTokenAction] error", error);
    return { success: false, message: "No se pudo actualizar la contraseña. Inténtalo más tarde." };
  }
}

async function sendResetEmail(input: { to: string; name: string; condominiumName: string; resetLink: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_MAIL_FROM || `Condominio ${input.condominiumName} <soporte@insulae.sistemasabanza.com>`;
  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: sans-serif; line-height: 1.6; color: #333333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8dbcc; border-radius: 8px; }
      .header { background-color: #1a4d3e; color: #ffffff; padding: 15px; text-align: center; border-radius: 6px 6px 0 0; }
      .content { padding: 20px; background-color: #faf8f5; }
      .button { display: inline-block; background: #1a4d3e; color: #fff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0; }
      .footer { font-size: 11px; color: #958172; text-align: center; margin-top: 20px; border-top: 1px solid #e8dbcc; padding-top: 15px; }
    </style></head>
    <body><div class="container">
      <div class="header"><h2>${input.condominiumName}</h2></div>
      <div class="content">
        <p>Hola <strong>${input.name}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu acceso al panel administrativo.</p>
        <p><a class="button" href="${input.resetLink}">Restablecer contraseña</a></p>
        <p>O copia este enlace en tu navegador:<br><a href="${input.resetLink}">${input.resetLink}</a></p>
        <p><strong>El enlace expira en 1 hora.</strong> Si no solicitaste este cambio, ignora este correo.</p>
      </div>
      <div class="footer">Correo automático del sistema condominal de ${input.condominiumName}.</div>
    </div></body></html>`;

  if (!apiKey) {
    console.warn(`[password-reset] RESEND_API_KEY no configurado. Enlace de restablecimiento para ${input.to}: ${input.resetLink}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Restablecer contraseña - ${input.condominiumName}`,
      html,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend respondió ${response.status}: ${detail}`);
  }
}
