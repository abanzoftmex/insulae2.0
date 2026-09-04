/**
 * GET /api/condomino/auth/me
 * Valida el token Bearer del condómino y devuelve sus datos básicos.
 * Lo usa el minisitio para verificar la sesión al cargar.
 * Devuelve 403 si el usuario ya no tiene el rol "Solo Minisitio" (el minisitio cierra la sesión).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";
import { MINISITIO_ACCESS_DENIED_MESSAGE, minisitioRoleWhere } from "@/shared/application/auth/condomino-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: "Token inválido o expirado." }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId, condominiumId: session.condominiumId, isActive: true },
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
      userRoles: { where: { role: minisitioRoleWhere(session.condominiumId) }, select: { id: true }, take: 1 },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, message: "Cuenta no encontrada o inactiva." }, { status: 401 });
  }
  if (user.userRoles.length === 0) {
    return NextResponse.json({ success: false, message: MINISITIO_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const rentalCount = await prisma.rental.count({
    where: {
      condominiumId: session.condominiumId,
      OR: [{ administrativeContactUserId: user.id }, { operativeContactUserId: user.id }],
    },
  });
  const hasPropiedades = user.assignments.length > 0;
  const hasComerciosArrendamientos = rentalCount > 0;
  const userType =
    hasPropiedades && hasComerciosArrendamientos ? "both" : hasComerciosArrendamientos ? "arrendatario" : "propietario";

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      id_directorio: user.id,
      email: user.email || user.personalEmail || user.businessEmail || null,
      nombre: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.businessName || "Condómino",
      userType,
    },
    userIndicators: { hasPropiedades, hasComerciosArrendamientos },
  });
}
