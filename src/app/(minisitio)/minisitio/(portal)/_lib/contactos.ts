/**
 * Contactos del condominio: en qué grupo va cada uno y qué se puede hacer con él (llamar,
 * WhatsApp, escribir, ver el mapa). Los enlaces guardados no sirven para teléfonos (hay
 * "https://tel:…", números sueltos y wa.me sin lada), así que las acciones se arman con el tipo
 * y el contenido; solo la dirección usa su enlace, y solo si es una URL.
 */
import type { CampoContacto } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { formatPhone, telHref } from "./format";

export type GrupoContacto = "emergencias" | "administracion" | "experiencias";

export const GRUPOS: { id: GrupoContacto; titulo: string; descripcion: string }[] = [
  { id: "emergencias", titulo: "Emergencias", descripcion: "Paramédicos y casetas de vigilancia, las 24 horas." },
  { id: "administracion", titulo: "Administración", descripcion: "Oficinas, recepción y medios para escribirnos." },
  { id: "experiencias", titulo: "Experiencias", descripcion: "Eventos, recorridos y sesiones de fotos." },
];

const URGENCIA_MEDICA = /param[eé]dic|ambulanc|emergenc|bomber|protecci[oó]n civil/i;
const SEGURIDAD = /caseta|seguridad|guardia|vigilan/i;
const EXPERIENCIA = /experiencia|evento|tour|fotos/i;

export interface AccionContacto {
  id: "llamar" | "whatsapp" | "correo" | "mapa";
  label: string;
  href: string;
  /** Se abre en otra pestaña. */
  externa: boolean;
}

export interface Contacto {
  id: string;
  nombre: string;
  /** Lo que se muestra (teléfono con espacios, correo, dirección). */
  valor: string;
  grupo: GrupoContacto;
  /** Urgencia médica: va primero dentro de Emergencias. */
  medica: boolean;
  acciones: AccionContacto[];
}

const digits = (value: string) => value.replace(/\D/g, "");

function whatsappHref(value: string): string | null {
  const d = digits(value);
  if (d.length === 10) return `https://wa.me/52${d}`;
  if (d.length === 12 && d.startsWith("52")) return `https://wa.me/${d}`;
  return null;
}

export function toContacto(c: CampoContacto): Contacto {
  const nombre = c.titulo?.trim() || "Contacto";
  const valor = c.contenido?.trim() ?? "";
  const acciones: AccionContacto[] = [];
  const llamar = telHref(valor);

  if (c.tipo_id === 2 || /@/.test(valor)) {
    acciones.push({ id: "correo", label: "Escribir", href: `mailto:${valor}`, externa: false });
  } else if (c.tipo_id === 1) {
    const enlace = c.enlace?.trim() ?? "";
    const mapa = /^https?:\/\//i.test(enlace) ? enlace : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(valor)}`;
    acciones.push({ id: "mapa", label: "Ver mapa", href: mapa, externa: true });
  } else {
    const wa = c.tipo_id === 4 ? whatsappHref(valor) : null;
    if (wa) acciones.push({ id: "whatsapp", label: "WhatsApp", href: wa, externa: true });
    if (llamar) acciones.push({ id: "llamar", label: "Llamar", href: llamar, externa: false });
  }

  const medica = URGENCIA_MEDICA.test(nombre);
  const grupo: GrupoContacto = medica || SEGURIDAD.test(nombre) ? "emergencias" : EXPERIENCIA.test(nombre) ? "experiencias" : "administracion";
  return { id: c.id, nombre, valor: llamar && c.tipo_id !== 2 ? formatPhone(valor) : valor, grupo, medica, acciones };
}

/** Emergencias con teléfono: urgencias médicas primero y un número por nombre (para Inicio). */
export function telefonosDeEmergencia(campos: CampoContacto[], max: number): Contacto[] {
  const vistos = new Set<string>();
  return campos
    .map(toContacto)
    .filter((c) => c.grupo === "emergencias" && c.acciones.some((a) => a.id === "llamar"))
    .sort((a, b) => Number(b.medica) - Number(a.medica))
    .filter((c) => {
      const key = c.nombre.toLowerCase();
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    })
    .slice(0, max);
}
