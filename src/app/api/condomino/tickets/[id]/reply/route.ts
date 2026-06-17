/**
 * POST /api/condomino/tickets/[id]/reply → el condómino responde a su ticket.
 * Sin campo dedicado en el modelo: se anexa a description con un marcador.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

const REPLY_MARK = "\n\n---RESPUESTA_CONDOMINO---\n";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  let body: { respuesta?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Solicitud inválida." }, { status: 400 });
  }
  const respuesta = (body?.respuesta || "").trim();
  if (!respuesta) {
    return NextResponse.json({ success: false, message: "La respuesta no puede estar vacía" }, { status: 400 });
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id, condominiumId: session.condominiumId, openedById: session.userId },
    select: { id: true, description: true },
  });
  if (!ticket) {
    return NextResponse.json({ success: false, message: "No tienes permiso para responder a este ticket" }, { status: 403 });
  }

  // Reemplaza/añade el bloque de respuesta del condómino
  const base = (ticket.description || "").split(REPLY_MARK)[0];
  const stamp = new Date().toISOString();
  const newDescription = `${base}${REPLY_MARK}[${stamp}]\n${respuesta}`;

  await prisma.ticket.update({ where: { id: ticket.id }, data: { description: newDescription } });

  return NextResponse.json({ success: true, message: "Respuesta enviada exitosamente", ticketId: ticket.id });
}
