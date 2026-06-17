/**
 * GET /api/condomino/project → datos públicos del proyecto (logo, nombre, aviso, totalM2).
 * Público (lo usan login/forgot/reset antes de autenticar).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";

export const dynamic = "force-dynamic";

export async function GET() {
  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true, name: true },
  });
  if (!condominium) {
    return NextResponse.json({ nombre: PROJECT_SCOPE.condominiumName, totalM2: 0, logo: null, avisoPrivacidad: null, sintesisAviso: null });
  }

  const project = await prisma.project.findFirst({
    where: { condominiumId: condominium.id, isActive: true },
    select: { name: true, totalM2: true, condominiumLogoUrl: true, privacyNoticeText: true },
  });

  return NextResponse.json({
    nombre: project?.name || condominium.name,
    totalM2: project?.totalM2 ? Number(project.totalM2) : 0,
    logo: project?.condominiumLogoUrl || null,
    avisoPrivacidad: project?.privacyNoticeText || null,
    sintesisAviso: null,
  });
}
