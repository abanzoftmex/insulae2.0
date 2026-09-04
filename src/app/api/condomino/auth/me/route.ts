/**
 * GET /api/condomino/auth/me
 * Valida el token Bearer del condómino y devuelve sus datos básicos.
 * Lo usa el minisitio para verificar la sesión al cargar y en cada cambio de página.
 * Devuelve 401 (code ACCESS_REVOKED) si el usuario ya no está activo o perdió el rol
 * "Solo Minisitio"; el minisitio cierra la sesión ante cualquier respuesta no exitosa.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { requireCondomino } from "@/shared/application/auth/condomino-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireCondomino(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;

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
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, message: "Cuenta no encontrada o inactiva." }, { status: 401 });
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
