/**
 * GET /api/condomino/contacts
 * Directorio de contactos / números de emergencia del condominio.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

function iconAndColor(typeName: string): { tipo_id: number; icono: string; color: string } {
  const t = (typeName || "").toLowerCase();
  if (t.includes("mail") || t.includes("correo") || t.includes("email")) return { tipo_id: 2, icono: "Mail", color: "emerald" };
  if (t.includes("whats")) return { tipo_id: 4, icono: "MessageCircle", color: "orange" };
  if (t.includes("tel") || t.includes("phone") || t.includes("celular")) return { tipo_id: 3, icono: "Phone", color: "blue" };
  if (t.includes("ofic") || t.includes("dir")) return { tipo_id: 1, icono: "Building", color: "purple" };
  return { tipo_id: 0, icono: "Phone", color: "blue" };
}

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const entries = await prisma.contactEntry.findMany({
    where: { condominiumId: session.condominiumId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, name: true, value: true, linkUrl: true, linkTarget: true, sortOrder: true,
      contactType: { select: { name: true } },
    },
  });

  const campos = entries.map((e) => {
    const typeName = e.contactType?.name || "General";
    const ic = iconAndColor(typeName);
    return {
      id: e.id,
      contenido: e.value,
      titulo: e.name,
      activo: 1,
      enlace: e.linkUrl || null,
      target: e.linkTarget === "NEW_TAB" ? "_blank" : null,
      orden: e.sortOrder ?? 0,
      principal: 0,
      tipo_id: ic.tipo_id,
      tipo_contacto: typeName,
      icono: ic.icono,
      color: ic.color,
    };
  });

  return NextResponse.json({ success: true, campos });
}
