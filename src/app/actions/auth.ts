"use server";

import { cookies } from "next/headers";
import { prisma } from "@/shared/infrastructure/db/prisma";
import crypto from "crypto";

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

export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<LoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Por favor, ingresa tu correo y contraseña." };
  }

  const cleanEmail = email.trim();
  const cleanPassword = password.trim();

  // Database-based Authentication
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanEmail, mode: "insensitive" } },
          { personalEmail: { equals: cleanEmail, mode: "insensitive" } },
          { businessEmail: { equals: cleanEmail, mode: "insensitive" } },
        ],
      },
    });

    if (!user) {
      return { success: false, error: "Credenciales incorrectas. Inténtalo de nuevo." };
    }

    if (!user.isActive) {
      return { success: false, error: "Tu cuenta se encuentra inactiva. Contacta al administrador." };
    }

    let isPasswordValid = false;

    // Check password using multiple possible legacy hashing formats
    if (user.passwordHash) {
      const sha256Hash = hashSHA256(cleanPassword);
      const md5Hash = hashMD5(cleanPassword);

      if (
        user.passwordHash === cleanPassword || // Plain text
        user.passwordHash === sha256Hash || // SHA256
        user.passwordHash === md5Hash // MD5
      ) {
        isPasswordValid = true;
      }
    } else {
      // If passwordHash is null, let's check with a default password for testing ease
      if (cleanPassword === "admin" || cleanPassword === "In$uL!ae25!" || cleanPassword === "Valquirico2026!") {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return { success: false, error: "Contraseña incorrecta. Inténtalo de nuevo." };
    }

    const roleType = (cleanEmail === "admin" || user.email === "admin@sassi.com") ? "ADMIN" : user.userType;

    const cookieStore = await cookies();
    cookieStore.set(
      "insulae_session",
      JSON.stringify({
        userId: user.id,
        email: user.email || user.personalEmail || user.businessEmail,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Usuario Insulae",
        role: roleType,
        authenticatedAt: new Date().toISOString(),
      }),

      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      }
    );

    return { success: true };
  } catch (error) {
    console.error("[Login Action] Error authenticating user:", error);
    return { success: false, error: "Ocurrió un error en el servidor. Inténtalo más tarde." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("insulae_session");
}

export async function getCurrentUser(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get("insulae_session")?.value;
    if (!sessionStr) return "Sistema";
    const session = JSON.parse(sessionStr);
    return session.name || "Sistema";
  } catch {
    return "Sistema";
  }
}

export async function getCurrentSession(): Promise<any> {
  try {
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get("insulae_session")?.value;
    if (!sessionStr) return null;
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentSession();
    if (!session || !session.userId) {
      return { success: false, error: "No hay un usuario autenticado." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    // Verify current password
    let isPasswordValid = false;
    if (user.passwordHash) {
      const sha256Hash = hashSHA256(currentPassword);
      const md5Hash = hashMD5(currentPassword);

      if (
        user.passwordHash === currentPassword || // Plain text
        user.passwordHash === sha256Hash || // SHA256
        user.passwordHash === md5Hash // MD5
      ) {
        isPasswordValid = true;
      }
    } else {
      // If user had no passwordHash (e.g. initial account)
      if (currentPassword === "admin" || currentPassword === "In$uL!ae25!" || currentPassword === "Valquirico2026!") {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return { success: false, error: "La contraseña actual es incorrecta." };
    }

    // Hash the new password with SHA-256
    const newPasswordHash = hashSHA256(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Clear session/logout to force relogin
    const cookieStore = await cookies();
    cookieStore.delete("insulae_session");

    return { success: true };
  } catch (error) {
    console.error("[Change Password Action] Error:", error);
    return { success: false, error: "Ocurrió un error al cambiar la contraseña." };
  }
}

