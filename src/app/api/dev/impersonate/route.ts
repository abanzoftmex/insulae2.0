/**
 * Endpoint de SUPLANTACIÓN para el modo superadmin del minisitio.
 *
 *   POST /api/dev/impersonate   body: { "userId": "..." }
 *        → firma un token de condómino (HMAC) para ese usuario y devuelve
 *          los mismos datos que /api/condomino/auth/login.
 *
 * Seguridad (igual que /api/dev/users):
 *   - Bloqueado en producción salvo que se defina SUPERADMIN_IMPERSONATE_SECRET.
 *   - Si SUPERADMIN_IMPERSONATE_SECRET está definido, exige el header
 *     `x-superadmin-secret` con ese valor (permite habilitarlo fuera de localhost).
 *   - Si NO está definido, solo se permite desde localhost.
 *
 * El minisitio nunca llama a esto directo desde el navegador: lo invoca su
 * propio endpoint server-side /api/superadmin/impersonate tras validar la
 * sesión de superadministrador.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { signCondominoToken } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

function assertAuthorized(request: NextRequest): NextResponse | null {
  const secret = process.env.SUPERADMIN_IMPERSONATE_SECRET;

  // Si hay secreto compartido, basta con que coincida (funciona en cualquier host).
  if (secret) {
    const provided = request.headers.get("x-superadmin-secret");
    if (provided && provided === secret) return null;
    return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });
  }

  // Sin secreto → mismo modelo que /api/dev/users: solo localhost y fuera de producción.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, message: "Suplantación deshabilitada en producción. Define SUPERADMIN_IMPERSONATE_SECRET para habilitarla." },
      { status: 403 }
    );
  }
  const host = (request.headers.get("host") || "").split(":")[0];
  const allowed = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host);
  if (!allowed) {
    return NextResponse.json({ success: false, message: `Solo accesible desde localhost (host: "${host}").` }, { status: 403 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const blocked = assertAuthorized(request);
  if (blocked) return blocked;

  const condo = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true },
  });
  if (!condo) {
    return NextResponse.json({ success: false, message: "Condominio no encontrado." }, { status: 404 });
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Body JSON inválido." }, { status: 400 });
  }

  const userId = (body?.userId || "").trim();
  if (!userId) {
    return NextResponse.json({ success: false, message: "Falta 'userId'." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, condominiumId: condo.id, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      businessName: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      userType: true,
      assignments: { where: { isActive: true }, select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, message: "Usuario no encontrado o inactivo." }, { status: 404 });
  }

  // Indicadores de tipo (mismo cálculo que login / me).
  const rentalCount = await prisma.rental.count({
    where: {
      condominiumId: condo.id,
      OR: [{ administrativeContactUserId: user.id }, { operativeContactUserId: user.id }],
    },
  });
  const hasPropiedades = user.assignments.length > 0;
  const hasComerciosArrendamientos = rentalCount > 0;
  const userType =
    hasPropiedades && hasComerciosArrendamientos
      ? "both"
      : hasComerciosArrendamientos
      ? "arrendatario"
      : "propietario";

  const token = signCondominoToken({ userId: user.id, condominiumId: condo.id });
  const loginEmail = user.email || user.personalEmail || user.businessEmail || null;

  return NextResponse.json({
    success: true,
    token,
    user: {
      id: user.id,
      id_directorio: user.id,
      email: loginEmail,
      nombre: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.businessName || "Condómino",
      userType,
    },
    userIndicators: { hasPropiedades, hasComerciosArrendamientos },
  });
}
