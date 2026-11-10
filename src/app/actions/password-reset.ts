"use server";

/**
 * Recuperación de contraseña del panel administrativo.
 *
 * 1. `requestPasswordResetAction(email)`: si existe un usuario activo con ese correo exacto y
 *    con acceso al panel, firma un token de 1 hora y envía el enlace por correo (Resend, vía
 *    API REST para no depender del SDK) a la dirección guardada que coincidió, no a la
 *    tecleada. Siempre responde igual: no revela si el correo existe. El dominio del enlace
 *    sale de `appOrigin()`, nunca de la petición.
 * 2. `resetPasswordWithTokenAction(token, newPassword)`: valida el token (un solo uso: lleva una
 *    huella de la contraseña) y fija la contraseña con SHA-256, el estándar del login.
 */
import crypto from "crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { adminResetTokenIsCurrent, readAdminResetToken, signAdminResetToken } from "@/shared/application/auth/admin-session";
import { canAccessAdminPanel, getPermissionsForUser } from "@/shared/application/auth/permissions";
import { appOrigin } from "@/shared/infrastructure/app-origin";
import { findUserIdsByEmail, storedEmailMatching } from "@/shared/infrastructure/db/user-email-lookup";
import { buildPasswordResetEmailHtml } from "@/shared/infrastructure/email/auth-email-templates";
import { resolveFooterLogoAsset } from "@/shared/infrastructure/email/email-footer-asset";

const GENERIC_OK =
  "Si el correo está registrado y tiene acceso al panel, recibirás un enlace para restablecer tu contraseña.";
const INVALID_LINK = "El enlace es inválido, expiró o ya se usó. Solicita uno nuevo.";

export async function requestPasswordResetAction(emailInput: string): Promise<{ success: boolean; message: string }> {
  const email = (emailInput || "").trim();
  if (!email) return { success: false, message: "Ingresa tu correo." };

  try {
    const ids = await findUserIdsByEmail(email);
    const candidates = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids }, isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userType: true,
            passwordHash: true,
            email: true,
            personalEmail: true,
            businessEmail: true,
            condominium: { select: { name: true } },
          },
        })
      : [];

    // Un correo puede compartirse entre varias cuentas (dato legacy): elegimos la que tenga acceso al panel.
    let target: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      const perms = await getPermissionsForUser(candidate.id);
      if (candidate.userType === "ADMIN" || canAccessAdminPanel(perms)) {
        target = candidate;
        break;
      }
    }
    const to = target && storedEmailMatching(target, email);
    if (!target || !to) return { success: true, message: GENERIC_OK };

    const token = await signAdminResetToken(target.id, target.passwordHash);
    const resetLink = `${await appOrigin()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
    const name = [target.firstName, target.lastName].filter(Boolean).join(" ") || "usuario";
    const condominiumName = target.condominium?.name || "Insulae";

    await sendResetEmail({ to, name, condominiumName, resetLink });
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
  const payload = await readAdminResetToken(token);
  if (!payload) {
    return { success: false, message: INVALID_LINK };
  }
  const password = (newPassword || "").trim();
  if (password.length < 8) {
    return { success: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, passwordHash: true },
    });
    if (!user || !user.isActive) {
      return { success: false, message: "La cuenta no existe o está inactiva." };
    }
    if (!(await adminResetTokenIsCurrent(payload, user.passwordHash))) {
      return { success: false, message: INVALID_LINK };
    }
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    // Misma contraseña = misma huella: el enlace seguiría sirviendo. Se exige una distinta.
    if (hash === user.passwordHash) {
      return { success: false, message: "La nueva contraseña debe ser distinta de la actual." };
    }
    // Condicionado a la contraseña leída: si otro uso del mismo enlace ganó la carrera, no se aplica.
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash },
      data: { passwordHash: hash },
    });
    if (count === 0) return { success: false, message: INVALID_LINK };
    return { success: true, message: "Contraseña actualizada. Ya puedes iniciar sesión." };
  } catch (error) {
    console.error("[resetPasswordWithTokenAction] error", error);
    return { success: false, message: "No se pudo actualizar la contraseña. Inténtalo más tarde." };
  }
}

async function sendResetEmail(input: { to: string; name: string; condominiumName: string; resetLink: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_MAIL_FROM || `Condominio ${input.condominiumName} <finanzas@info.valquirico.com>`;
  const origin = await appOrigin();
  const footerLogo = resolveFooterLogoAsset(origin);
  const html = buildPasswordResetEmailHtml({
    recipientName: input.name,
    resetLink: input.resetLink,
    condominiumName: input.condominiumName,
    logoUrl: `${origin}/brand/valquirico-logo-light.png`,
    appBaseUrl: origin,
    footerLogoSrc: footerLogo.footerLogoSrc,
    expiresInMinutes: 60,
  });

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
      ...(footerLogo.restAttachment ? { attachments: [footerLogo.restAttachment] } : {}),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend respondió ${response.status}: ${detail}`);
  }
}
