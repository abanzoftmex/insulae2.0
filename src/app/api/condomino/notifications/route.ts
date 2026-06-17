/**
 * GET /api/condomino/notifications
 * Comunicados/notificaciones del condominio (URLs de Firebase ya completas).
 *   ?destacados=1  → solo los que tienen imagen o pdf (experiencias)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const url = new URL(request.url);
  const destacados = url.searchParams.get("destacados") === "1";

  const all = await prisma.notification.findMany({
    where: { condominiumId: session.condominiumId },
    orderBy: { sentAt: "desc" },
    select: { id: true, title: true, message: true, pdfUrl: true, imageUrl: true, sentAt: true, validUntil: true, category: true },
  });

  const notifications = (destacados ? all.filter((n) => n.imageUrl || n.pdfUrl) : all).map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    pdfUrl: n.pdfUrl,
    imageUrl: n.imageUrl,
    sentAt: n.sentAt,
    validUntil: n.validUntil,
    category: n.category || "General",
  }));

  return NextResponse.json({ success: true, notifications, total: notifications.length });
}
