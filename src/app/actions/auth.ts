"use server";

/**
 * Autenticación del panel administrativo.
 *
 * - La cookie de sesión es un token firmado (ver admin-session.ts); su contenido no otorga permisos.
 * - Solo entra quien tiene contraseña definida y al menos un módulo legible según sus roles
 *   (o la cuenta de sistema con userType ADMIN). Los condóminos usan el minisitio.
 * - No existen contraseñas por defecto: una cuenta sin contraseña se activa con
 *   "¿Olvidaste tu contraseña?" o con la contraseña provisional que genera el Directorio.
 * - Contraseñas con scrypt (password-hash.ts). Mientras no se verifica la contraseña, todos los
 *   errores dan el mismo mensaje: antes se podía saber qué correos existían, cuáles estaban
 *   inactivos y cuáles no tenían contraseña. Los intentos fallidos se limitan (auth-throttle.ts).
 */
import { cookies } from "next/headers";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { findUserIdsByEmail } from "@/shared/infrastructure/db/user-email-lookup";
import {
  clearThrottle,
  clientIp,
  consumeAttempt,
  loginAccountKeys,
  loginThrottleRules,
  passwordChangeThrottleRules,
} from "@/shared/infrastructure/db/auth-throttle";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  signAdminSession,
  type AdminSession,
} from "@/shared/application/auth/admin-session";
import { hashPassword, verifyPassword } from "@/shared/application/auth/password-hash";
import { matchPasswordCandidates } from "@/shared/application/auth/password-login";
import {
  canAccessAdminPanel,
  getPermissionsForUser,
  readAdminSession,
} from "@/shared/application/auth/permissions";

export type LoginResult = {
  success: boolean;
  error?: string;
};

const INVALID_CREDENTIALS =
  "Correo o contraseña incorrectos. Si aún no tienes contraseña, usa “¿Olvidaste tu contraseña?” para crearla.";
const TOO_MANY_ATTEMPTS = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";

export async function loginAction(
  _prevState: unknown,
  formData: FormData
): Promise<LoginResult> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null)?.trim() ?? "";

  if (!email || !password) {
    return { success: false, error: "Por favor, ingresa tu correo y contraseña." };
  }

  try {
    // El intento se cuenta antes de verificar (ver auth-throttle.ts).
    const throttle = loginThrottleRules(email, await clientIp());
    if (!(await consumeAttempt(throttle))) {
      return { success: false, error: TOO_MANY_ATTEMPTS };
    }

    // Un correo puede estar compartido por varias cuentas (dato legacy): desambiguamos por contraseña.
    // La consulta se hace aunque no haya ids, para que el tiempo no revele si el correo existe.
    const ids = await findUserIdsByEmail(email);
    const candidates = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        isActive: true,
        passwordHash: true,
        userType: true,
        firstName: true,
        lastName: true,
        businessName: true,
        email: true,
        personalEmail: true,
        businessEmail: true,
      },
    });

    const matched = await matchPasswordCandidates(candidates, password);
    if (matched.length === 0) {
      return { success: false, error: INVALID_CREDENTIALS };
    }

    // La contraseña ya se comprobó: desde aquí los mensajes pueden ser específicos.
    const activos = matched.filter((u) => u.isActive);
    if (activos.length === 0) {
      return { success: false, error: "Tu cuenta se encuentra inactiva. Contacta al administrador." };
    }

    // Entre las cuentas cuya contraseña coincide, la primera con acceso al panel.
    let user: (typeof activos)[number] | null = null;
    for (const candidate of activos) {
      if (candidate.userType === "ADMIN" || canAccessAdminPanel(await getPermissionsForUser(candidate.id))) {
        user = candidate;
        break;
      }
    }
    if (!user) {
      return {
        success: false,
        error: "Tu cuenta no tiene acceso al panel administrativo. Si eres condómino, usa el portal de condóminos.",
      };
    }

    await clearThrottle(loginAccountKeys(throttle));

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.businessName || "Usuario Insulae";
    const token = await signAdminSession({
      userId: user.id,
      email: user.email || user.personalEmail || user.businessEmail || null,
      name,
      passwordHash: user.passwordHash,
    });

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ADMIN_SESSION_TTL_SECONDS,
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("[Login Action] Error authenticating user:", error);
    return { success: false, error: "Ocurrió un error en el servidor. Inténtalo más tarde." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<string> {
  const session = await readAdminSession();
  return session?.name || "Sistema";
}

/** Sesión verificada del usuario actual, o null si no hay sesión válida. */
export async function getCurrentSession(): Promise<AdminSession | null> {
  return readAdminSession();
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await readAdminSession();
    if (!session) {
      return { success: false, error: "No hay un usuario autenticado." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    // Con una sesión robada no se debe poder adivinar la contraseña actual a fuerza de intentos.
    const throttle = passwordChangeThrottleRules(user.id);
    if (!(await consumeAttempt(throttle))) {
      return { success: false, error: TOO_MANY_ATTEMPTS };
    }
    if (!(await verifyPassword(currentPassword.trim(), user.passwordHash)).ok) {
      return { success: false, error: "La contraseña actual es incorrecta." };
    }

    if (newPassword.trim().length < 8) {
      return { success: false, error: "La nueva contraseña debe tener al menos 8 caracteres." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword.trim()) },
    });
    await clearThrottle(throttle.map((rule) => rule.key));

    // Cerrar sesión para forzar un nuevo inicio con la contraseña nueva. Las sesiones abiertas
    // en otros dispositivos también dejan de valer (llevan la huella de la contraseña anterior).
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_SESSION_COOKIE);

    return { success: true };
  } catch (error) {
    console.error("[Change Password Action] Error:", error);
    return { success: false, error: "Ocurrió un error al cambiar la contraseña." };
  }
}
