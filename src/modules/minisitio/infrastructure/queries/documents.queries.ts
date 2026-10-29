/**
 * Documentos condominales (reglamentos / documentos internos) y números de emergencia.
 */
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { getActiveProject } from "../condominium";

function resolveDocUrl(bucket: string, path: string): string {
  const p = (path || "").trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (!bucket || bucket === "legacy-import") return p;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(p)}?alt=media`;
}

export async function listDocuments(session: CondominoTokenPayload) {
  const project = await getActiveProject(session.condominiumId);
  if (!project) return { documentos: [] as Documento[] };

  const docs = await prisma.projectDocument.findMany({
    where: { projectId: project.id, isActive: true },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, fileName: true, documentType: true, storageBucket: true, storagePath: true },
  });

  const documentos = docs.map((d) => ({
    id_proyectos_documentos: d.id,
    nombre: d.fileName,
    archivo: resolveDocUrl(d.storageBucket, d.storagePath),
    descripcion: null as string | null,
    activo: 1,
    id_proyectos: project.id,
    id_cat_tipos_documento: d.documentType === "REGULATION" ? 1 : 2,
  }));
  return { documentos };
}

export interface Documento {
  id_proyectos_documentos: string;
  nombre: string;
  archivo: string;
  descripcion: string | null;
  activo: number;
  id_proyectos: string;
  id_cat_tipos_documento: number;
}

function iconAndColor(typeName: string): { tipo_id: number; icono: string; color: string } {
  const t = (typeName || "").toLowerCase();
  if (t.includes("mail") || t.includes("correo") || t.includes("email")) return { tipo_id: 2, icono: "Mail", color: "emerald" };
  if (t.includes("whats")) return { tipo_id: 4, icono: "MessageCircle", color: "orange" };
  if (t.includes("tel") || t.includes("phone") || t.includes("celular")) return { tipo_id: 3, icono: "Phone", color: "blue" };
  if (t.includes("ofic") || t.includes("dir")) return { tipo_id: 1, icono: "Building", color: "purple" };
  return { tipo_id: 0, icono: "Phone", color: "blue" };
}

/** Directorio de contactos / números de emergencia del condominio. */
export async function listContactFields(session: CondominoTokenPayload) {
  const entries = await prisma.contactEntry.findMany({
    where: { condominiumId: session.condominiumId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      value: true,
      linkUrl: true,
      linkTarget: true,
      sortOrder: true,
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
  return { success: true as const, campos };
}

export type CampoContacto = Awaited<ReturnType<typeof listContactFields>>["campos"][number];
