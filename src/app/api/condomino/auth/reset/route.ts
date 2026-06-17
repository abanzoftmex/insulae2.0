/**
 * POST /api/condomino/auth/reset  { token, newPassword }
 * Fija la contraseña (SHA256) si el token de reset es válido.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { verifyResetToken } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { token?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Solicitud inválida." }, { status: 400 });
  }
  const token = body?.token || "";
  const newPassword = (body?.newPassword || "").trim();

  const payload = verifyResetToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, message: "El enlace es inválido o expiró. Solicita uno nuevo." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ success: false, message: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
  if (!user) return NextResponse.json({ success: false, message: "Usuario no encontrado" }, { status: 404 });

  const hash = crypto.createHash("sha256").update(newPassword).digest("hex");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

  return NextResponse.json({ success: true, message: "Contraseña actualizada exitosamente" });
}
