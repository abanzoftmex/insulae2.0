/**
 * GET  /api/condomino/tickets   → tickets abiertos por el condómino (?status=open|closed)
 * POST /api/condomino/tickets   → crea un ticket
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

const REPLY_MARK = "\n\n---RESPUESTA_CONDOMINO---\n";

function statusToLegacy(status: string): { id: number; texto: string } {
  return status === "RESOLVED" || status === "CLOSED" ? { id: 2, texto: "Cerrado" } : { id: 1, texto: "Abierto" };
}

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const status = new URL(request.url).searchParams.get("status");
  const where: Record<string, unknown> = { condominiumId: session.condominiumId, openedById: session.userId };
  if (status === "open") where.status = { in: ["OPEN", "IN_PROGRESS"] };
  if (status === "closed") where.status = { in: ["RESOLVED", "CLOSED"] };

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { openedAt: "desc" },
    select: {
      id: true, title: true, description: true, openedAt: true, status: true, openedById: true,
      response: true, respondedAt: true, responsePdfUrl: true, responseImageUrl: true,
      department: { select: { id: true, name: true, email: true } },
    },
  });

  const out = tickets.map((t) => {
    const st = statusToLegacy(t.status);
    let descripcion = t.description || "";
    let respuestaUsuario: string | null = null;
    let fechaRespuestaUsuario: string | null = null;
    const idx = descripcion.indexOf(REPLY_MARK);
    if (idx >= 0) {
      const replyBlock = descripcion.slice(idx + REPLY_MARK.length);
      descripcion = descripcion.slice(0, idx);
      const m = replyBlock.match(/^\[(.+?)\]\s*([\s\S]*)$/);
      if (m) {
        fechaRespuestaUsuario = m[1];
        respuestaUsuario = m[2].trim();
      } else {
        respuestaUsuario = replyBlock.trim();
      }
    }
    return {
      id_tickets: t.id,
      nombre: t.title,
      descripcion,
      fecha: t.openedAt,
      id_cat_status_tickets: st.id,
      id_directorio: t.openedById,
      respuesta: t.response || null,
      pdf_respuesta: t.responsePdfUrl || null,
      imagen_respuesta: t.responseImageUrl || null,
      respuesta_usuario: respuestaUsuario,
      fecha_respuesta_usuario: fechaRespuestaUsuario,
      id_tickets_departamentos: t.department?.id ?? null,
      departamento: t.department?.name ?? null,
      departamento_email: t.department?.email ?? null,
      status_texto: st.texto,
    };
  });

  return NextResponse.json({ success: true, tickets: out });
}

export async function POST(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  let body: { id_tickets_departamentos?: string; nombre?: string; descripcion?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Solicitud inválida." }, { status: 400 });
  }
  const nombre = (body?.nombre || "").trim();
  const descripcion = (body?.descripcion || "").trim();
  const departamentoId = body?.id_tickets_departamentos || null;
  if (!nombre || !descripcion) {
    return NextResponse.json({ success: false, message: "Todos los campos son obligatorios" }, { status: 400 });
  }

  // Validar departamento (si viene) pertenece al condominio
  let department: { id: string; name: string; email: string } | null = null;
  if (departamentoId) {
    department = await prisma.ticketDepartment.findFirst({
      where: { id: String(departamentoId), condominiumId: session.condominiumId, isActive: true },
      select: { id: true, name: true, email: true },
    });
  }

  const ticket = await prisma.ticket.create({
    data: {
      condominiumId: session.condominiumId,
      openedById: session.userId,
      departmentId: department?.id ?? null,
      title: nombre,
      description: descripcion,
      status: "OPEN",
    },
    select: { id: true, title: true, description: true, openedAt: true },
  });

  return NextResponse.json(
    {
      success: true,
      message: "Ticket creado exitosamente",
      ticket: {
        id: ticket.id,
        nombre: ticket.title,
        descripcion: ticket.description,
        fecha: ticket.openedAt,
        departamento: department?.name ?? null,
        departamento_email: department?.email ?? null,
        status: "Abierto",
      },
    },
    { status: 201 }
  );
}
