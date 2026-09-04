/**
 * GET /api/condomino/documents
 * Documentos del proyecto (reglamentos / documentos internos), con URL de descarga.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { requireCondomino } from "@/shared/application/auth/condomino-session";

export const dynamic = "force-dynamic";

function resolveDocUrl(bucket: string, path: string): string {
  const p = (path || "").trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (!bucket || bucket === "legacy-import") return p;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(p)}?alt=media`;
}

export async function GET(request: NextRequest) {
  const auth = await requireCondomino(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const project = await prisma.project.findFirst({
    where: { condominiumId: session.condominiumId, isActive: true },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ success: true, documentos: [] });

  const docs = await prisma.projectDocument.findMany({
    where: { projectId: project.id, isActive: true },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, fileName: true, documentType: true, storageBucket: true, storagePath: true },
  });

  const documentos = docs.map((d) => ({
    id_proyectos_documentos: d.id,
    nombre: d.fileName,
    archivo: resolveDocUrl(d.storageBucket, d.storagePath),
    descripcion: null,
    activo: 1,
    id_proyectos: project.id,
    id_cat_tipos_documento: d.documentType === "REGULATION" ? 1 : 2,
  }));

  return NextResponse.json({ success: true, documentos });
}
