"use server";

/**
 * Autenticación del panel administrativo.
 *
 * - La cookie de sesión es un token firmado (ver admin-session.ts); su contenido no otorga permisos.
 * - Solo entra quien tiene contraseña definida y al menos un módulo legible según sus roles
 *   (o la cuenta de sistema con userType ADMIN). Los condóminos usan el minisitio.
 * - No existen contraseñas por defecto: una cuenta sin contraseña se activa con
 *   "¿Olvidaste tu contraseña?" o con la contraseña provisional que genera el Directorio.
 */
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  signAdminSession,
  type AdminSession,
} from "@/shared/application/auth/admin-session";
import {
  canAccessAdminPanel,
  getPermissionsForUser,
  readAdminSession,
} from "@/shared/application/auth/permissions";

export type LoginResult = {
  success: boolean;
  error?: string;
};

function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function hashMD5(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex");
}

/** Acepta los formatos heredados del legacy (SHA-256 estándar, MD5 y texto plano). */
function passwordMatches(storedHash: string | null, password: string): boolean {
  if (!storedHash) return false;
  return storedHash === hashSHA256(password) || storedHash === hashMD5(password) || storedHash === password;
}

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
    // Un correo puede estar compartido por varias cuentas (dato legacy): desambiguamos por contraseña.
    const candidates = await prisma.user.findMany({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { personalEmail: { equals: email, mode: "insensitive" } },
          { businessEmail: { equals: email, mode: "insensitive" } },
        ],
      },
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

    if (candidates.length === 0) {
      return { success: false, error: "Credenciales incorrectas. Inténtalo de nuevo." };
    }

    const activos = candidates.filter((u) => u.isActive);
    if (activos.length === 0) {
      return { success: false, error: "Tu cuenta se encuentra inactiva. Contacta al administrador." };
    }

    const matched = activos.filter((u) => passwordMatches(u.passwordHash, password));
    if (matched.length === 0) {
      if (activos.every((u) => !u.passwordHash)) {
        return {
          success: false,
          error: "Tu cuenta aún no tiene contraseña. Usa “¿Olvidaste tu contraseña?” para crearla.",
        };
      }
      return { success: false, error: "Contraseña incorrecta. Inténtalo de nuevo." };
    }

    // Entre las cuentas cuya contraseña coincide, la primera con acceso al panel.
    let user: (typeof matched)[number] | null = null;
    for (const candidate of matched) {
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

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.businessName || "Usuario Insulae";
    const token = await signAdminSession({
      userId: user.id,
      email: user.email || user.personalEmail || user.businessEmail || null,
      name,
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

    if (!passwordMatches(user.passwordHash, currentPassword.trim())) {
      return { success: false, error: "La contraseña actual es incorrecta." };
    }

    if (newPassword.trim().length < 8) {
      return { success: false, error: "La nueva contraseña debe tener al menos 8 caracteres." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashSHA256(newPassword.trim()) },
    });

    // Cerrar sesión para forzar un nuevo inicio con la contraseña nueva.
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_SESSION_COOKIE);

    return { success: true };
  } catch (error) {
    console.error("[Change Password Action] Error:", error);
    return { success: false, error: "Ocurrió un error al cambiar la contraseña." };
  }
}
