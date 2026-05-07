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

  // 1. Fallback Admin Authentication (Legacy and convenience fallback)
  const isAdminUser = cleanEmail.toLowerCase() === "admin" || cleanEmail.toLowerCase() === "admin@insuale.com";
  const isAdminPassword = cleanPassword === "admin" || cleanPassword === "In$uL!ae25!";

  if (isAdminUser && isAdminPassword) {
    const cookieStore = await cookies();
    cookieStore.set(
      "insulae_session",
      JSON.stringify({
        userId: "admin-id",
        email: "admin@insuale.com",
        name: "Administrador Valquirico",
        role: "ADMIN",
        authenticatedAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      }
    );

    return { success: true };
  }

  // 2. Database-based Authentication
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

    const cookieStore = await cookies();
    cookieStore.set(
      "insulae_session",
      JSON.stringify({
        userId: user.id,
        email: user.email || user.personalEmail || user.businessEmail,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Usuario Insulae",
        role: user.userType,
        authenticatedAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
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
