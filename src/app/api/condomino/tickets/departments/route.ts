/**
 * GET /api/condomino/tickets/departments → departamentos de soporte del condominio.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true },
  });
  if (!condominium) return NextResponse.json({ success: true, departments: [] });

  // Permite tanto sesión válida como acceso del propio condominio (formulario de alta)
  const condoId = session?.condominiumId || condominium.id;

  const departments = await prisma.ticketDepartment.findMany({
    where: { condominiumId: condoId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({
    success: true,
    departments: departments.map((d) => ({ id: d.id, nombre: d.name, email: d.email })),
  });
}
