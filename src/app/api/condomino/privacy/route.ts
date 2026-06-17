/**
 * GET  /api/condomino/privacy  → aviso de privacidad (texto HTML + PDF). Público.
 * POST /api/condomino/privacy  → registra aceptación (no-op por ahora; sin campo dedicado).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";

export const dynamic = "force-dynamic";

export async function GET() {
  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true },
  });
  if (!condominium) return NextResponse.json({ aviso_privacidad: "", pdfAviso: null });

  const project = await prisma.project.findFirst({
    where: { condominiumId: condominium.id, isActive: true },
    select: { privacyNoticeText: true, privacyNoticePdfUrl: true },
  });

  return NextResponse.json({
    aviso_privacidad: project?.privacyNoticeText || "",
    pdfAviso: project?.privacyNoticePdfUrl || null,
  });
}

export async function POST(_request: NextRequest) {
  // El modelo User aún no tiene campo de aceptación; se confirma sin persistir.
  return NextResponse.json({ success: true, message: "Aviso de privacidad aceptado" });
}
