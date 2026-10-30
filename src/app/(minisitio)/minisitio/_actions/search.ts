"use server";

/**
 * Índice del buscador global del portal (⌘K). Se pide una vez, al abrir el buscador, y se
 * filtra en el navegador: así cada tecla responde al instante. Solo trae lo que el condómino
 * ya puede ver en sus pantallas (mismas consultas, mismo alcance de sesión) y en la forma
 * mínima que necesita una fila de resultados.
 */
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listProperties } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { listRentals } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { listComunicados } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { listContactFields, listDocuments } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { listTickets } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { documentoUrl } from "@/components/minisitio/documento-url";
import { categoriaComunicado } from "@/components/minisitio/comunicado-categoria";

export interface SearchIndex {
  propiedades: { id: string; nombre: string; clave: string; zona: string; vencido: boolean }[];
  comercios: { id: string; nombre: string; area: string; vencido: boolean }[];
  comunicados: { id: string; titulo: string; categoria: string; fecha: string | null; texto: string }[];
  documentos: { id: string; nombre: string; url: string; reglamento: boolean }[];
  contactos: { id: string; titulo: string; valor: string; tipo: string; enlace: string | null }[];
  solicitudes: { id: string; titulo: string; estado: string; fecha: string | null; departamento: string | null }[];
}

/** Recorta un texto largo a lo que sirve para buscar (los comunicados traen el cuerpo entero). */
const corto = (text: string | null | undefined, max = 280) => (text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export async function getSearchIndexAction(): Promise<SearchIndex> {
  const session = await requireCondominoSession();

  const [propiedades, comercios, comunicados, documentos, contactos, solicitudes] = await Promise.allSettled([
    listProperties(session),
    listRentals(session),
    listComunicados(session),
    listDocuments(session),
    listContactFields(session),
    listTickets(session),
  ]);

  for (const result of [propiedades, comercios, comunicados, documentos, contactos, solicitudes]) {
    if (result.status === "rejected") console.error("[minisitio] buscador:", result.reason);
  }
  const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);

  return {
    propiedades: (ok(propiedades)?.propiedades ?? []).map((p) => ({
      id: p.id_areas_privativas,
      nombre: p.nombre,
      clave: p.iniciales !== p.nombre ? p.iniciales : "",
      zona: p.zona,
      vencido: p.saldo_vencido > 0,
    })),
    comercios: (ok(comercios)?.arrendamientos ?? []).map((c) => ({
      id: c.id_arrendamientos,
      nombre: c.nombre_comercio,
      area: c.area_privativa,
      vencido: c.saldo_vencido > 0,
    })),
    comunicados: (ok(comunicados)?.comunicados ?? []).map((c) => ({
      id: c.id_notificaciones,
      titulo: c.nombre,
      categoria: categoriaComunicado(c.categoria_nombre),
      fecha: c.fechaPublicar,
      texto: corto(c.descripcion),
    })),
    documentos: (ok(documentos)?.documentos ?? []).map((d) => ({
      id: d.id_proyectos_documentos,
      nombre: d.nombre,
      url: documentoUrl(d.archivo),
      reglamento: d.id_cat_tipos_documento === 1,
    })),
    contactos: (ok(contactos)?.campos ?? []).map((c) => ({
      id: c.id,
      titulo: c.titulo,
      valor: c.contenido,
      tipo: c.tipo_contacto,
      enlace: c.enlace,
    })),
    solicitudes: (ok(solicitudes)?.tickets ?? []).map((t) => ({
      id: t.id_tickets,
      titulo: t.nombre,
      estado: t.status_texto,
      fecha: t.fecha,
      departamento: t.departamento,
    })),
  };
}
