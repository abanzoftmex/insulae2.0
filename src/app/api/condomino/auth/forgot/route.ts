/**
 * POST /api/condomino/auth/forgot  { email }
 * Si existe un usuario activo con ese email y con rol "Solo Minisitio", devuelve un token de reset (1h).
 * No revela si el email existe ni si tiene acceso (el minisitio envía el correo solo si hay token).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { signResetToken } from "@/shared/application/auth/condomino-token";
import { minisitioRoleWhere } from "@/shared/application/auth/condomino-access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Solicitud inválida." }, { status: 400 });
  }
  const email = (body?.email || "").trim();
  if (!email) return NextResponse.json({ success: false, message: "Email requerido." }, { status: 400 });

  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true },
  });
  if (!condominium) return NextResponse.json({ success: true });

  const user = await prisma.user.findFirst({
    where: {
      condominiumId: condominium.id,
      isActive: true,
      userRoles: { some: { role: minisitioRoleWhere(condominium.id) } },
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { personalEmail: { equals: email, mode: "insensitive" } },
        { businessEmail: { equals: email, mode: "insensitive" } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true, personalEmail: true, businessEmail: true },
  });

  if (!user) return NextResponse.json({ success: true }); // no revelar

  const loginEmail = user.email || user.personalEmail || user.businessEmail || email;
  const token = signResetToken({ userId: user.id, email: loginEmail });
  return NextResponse.json({
    success: true,
    token,
    email: loginEmail,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Condómino",
  });
}
