"use server";

/**
 * Acciones de autenticación del portal de condóminos: login, cierre de sesión, recuperación
 * de contraseña y aceptación del aviso de privacidad.
 */
import {
  clearCondominoSessionCookie,
  setCondominoSessionCookie,
} from "@/shared/application/auth/condomino-session";
import { signCondominoToken } from "@/shared/application/auth/condomino-token";
import {
  FORGOT_PASSWORD_GENERIC_MESSAGE,
  authenticateCondomino,
  requestPasswordReset,
  resetPassword,
  validateResetToken,
} from "@/modules/minisitio/application/auth.service";
import { requestOrigin } from "@/modules/minisitio/infrastructure/request-origin";
import type { ActionResult, MinisitioSessionInfo } from "@/modules/minisitio/domain/types";

export async function loginAction(input: { email: string; password: string }): Promise<ActionResult<MinisitioSessionInfo>> {
  try {
    const result = await authenticateCondomino(input?.email ?? "", input?.password ?? "");
    if (!result.ok) return { success: false, message: result.message };
    await setCondominoSessionCookie(await signCondominoToken(result.session));
    return { success: true, message: "Inicio de sesión exitoso", ...result.info };
  } catch (error) {
    console.error("[minisitio] loginAction:", error);
    return { success: false, message: "Error de conexión. Intenta nuevamente." };
  }
}

export async function logoutAction(): Promise<{ success: true }> {
  // Token stateless (HMAC): basta con borrar la cookie.
  await clearCondominoSessionCookie();
  return { success: true };
}

export async function forgotPasswordAction(email: string): Promise<ActionResult> {
  if (!(email || "").trim()) return { success: false, message: "Email es requerido" };
  try {
    await requestPasswordReset(email, await requestOrigin());
    // Nunca revelar si el correo existe.
    return { success: true, message: FORGOT_PASSWORD_GENERIC_MESSAGE };
  } catch (error) {
    console.error("[minisitio] forgotPasswordAction:", error);
    return { success: false, message: "Error interno del servidor" };
  }
}

export async function validateResetTokenAction(token: string): Promise<{ valid: boolean; email?: string; message: string }> {
  if (!token) return { valid: false, message: "Token requerido" };
  const result = await validateResetToken(token);
  return result.valid ? { valid: true, email: result.email, message: "Token válido" } : { valid: false, message: result.message };
}

export async function resetPasswordAction(input: { token: string; newPassword: string }): Promise<ActionResult> {
  if (!input?.token || !input?.newPassword) {
    return { success: false, message: "Token y nueva contraseña son requeridos" };
  }
  try {
    const result = await resetPassword(input.token, input.newPassword);
    return result.ok ? { success: true, message: result.message } : { success: false, message: result.message };
  } catch (error) {
    console.error("[minisitio] resetPasswordAction:", error);
    return { success: false, message: "No se pudo restablecer la contraseña" };
  }
}

/** El modelo User aún no tiene campo de aceptación: se confirma sin persistir (igual que antes). */
export async function acceptPrivacyNoticeAction(): Promise<ActionResult> {
  return { success: true, message: "Aviso de privacidad aceptado" };
}
