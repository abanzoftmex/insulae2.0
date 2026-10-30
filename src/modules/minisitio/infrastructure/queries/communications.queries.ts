/**
 * Comunicados / notificaciones del condominio (con la URL guardada de su imagen y PDF) en las
 * distintas formas que consume cada pantalla del portal.
 */
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { toIso } from "../condominium";

async function findNotifications(session: CondominoTokenPayload, options: { destacados?: boolean } = {}) {
  const all = await prisma.notification.findMany({
    where: { condominiumId: session.condominiumId },
    orderBy: { sentAt: "desc" },
    select: { id: true, title: true, message: true, pdfUrl: true, imageUrl: true, sentAt: true, validUntil: true, category: true },
  });
  // Destacados (experiencias): solo los que tienen imagen o pdf.
  return options.destacados ? all.filter((n) => n.imageUrl || n.pdfUrl) : all;
}

/** Pantalla Comunicados. */
export async function listComunicados(session: CondominoTokenPayload) {
  const comunicados = (await findNotifications(session)).map((n) => ({
    id_notificaciones: n.id,
    nombre: n.title,
    descripcion: n.message,
    pdf: n.pdfUrl || null,
    imagen: n.imageUrl || null,
    fechaPublicar: toIso(n.sentAt),
    fechaVigencia: toIso(n.validUntil),
    tipo_fijo: 3,
    categoria_nombre: n.category || "General",
  }));
  return { success: true as const, comunicados, total: comunicados.length };
}

export type Comunicado = Awaited<ReturnType<typeof listComunicados>>["comunicados"][number];

/** Experiencias / comunicados destacados (con imagen o PDF). */
export async function listComunicadosDestacados(session: CondominoTokenPayload) {
  const comunicados = (await findNotifications(session, { destacados: true })).map((n) => ({
    id_notificaciones: n.id,
    nombre: n.title,
    descripcion: n.message,
    fechaPublicar: toIso(n.sentAt),
    fechaVigencia: toIso(n.validUntil),
    id_dcat_categorias_notificaciones: null,
    imagen: n.imageUrl || null,
    pdf: n.pdfUrl || null,
  }));
  return { success: true as const, comunicados, total: comunicados.length };
}

export type ComunicadoDestacado = Awaited<ReturnType<typeof listComunicadosDestacados>>["comunicados"][number];

/** Los 5 comunicados más recientes (panel de bienvenida). */
export async function listComunicadosRecientes(session: CondominoTokenPayload) {
  const comunicados = (await findNotifications(session)).slice(0, 5).map((n) => ({
    id_notificaciones: n.id,
    nombre: n.title,
    descripcion: n.message,
    fechaPublicar: toIso(n.sentAt),
    fechaVigencia: toIso(n.validUntil),
    categoria: n.category || "General",
    imagen: n.imageUrl || null,
    pdf: n.pdfUrl || null,
  }));
  return { success: true as const, comunicados, total: comunicados.length };
}

export type ComunicadoReciente = Awaited<ReturnType<typeof listComunicadosRecientes>>["comunicados"][number];

/**
 * Metadatos de la sección Experiencias. La "gaceta" no tiene equivalente en insulae2.0
 * todavía; las experiencias en sí salen de listComunicadosDestacados().
 */
export function getExperienciasMeta() {
  return {
    experiencias: [] as unknown[],
    linkGaceta: null as string | null,
    sintesisAviso: null as string | null,
    tituloGaceta: null as string | null,
  };
}

export type ExperienciasMeta = ReturnType<typeof getExperienciasMeta>;
