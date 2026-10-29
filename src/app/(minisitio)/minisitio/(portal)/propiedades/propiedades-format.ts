/** Utilidades de formato compartidas por el listado, la tabla y el PDF de propiedades. */
import type { Propiedad } from "@/modules/minisitio/infrastructure/queries/properties.queries";

/**
 * Propiedad tal como la consumen las vistas. La consulta tipa como `null` literal los campos
 * legacy que insulae2.0 no tiene (indiviso FAP/condominio); aquí se ensanchan para conservar
 * las ramas de la UI que los muestran cuando traen valor.
 */
export type PropiedadView = Omit<Propiedad, "indiviso_fap_condominio"> & {
  indiviso_fap_condominio: number | null;
};

/** `parseFloat` del legacy, que recibía números, null o strings (en TS solo admite string). */
export const parseNum = (value: unknown): number => parseFloat(String(value));

/**
 * Fecha de "ayer" que pintaba el legacy: `new Date(Date.now() - 86400000).toLocaleDateString("es-MX", …)`.
 * Se fija la zona horaria de Val'Quirico para que el HTML del servidor y la hidratación coincidan.
 */
export function fechaAyer(options: Intl.DateTimeFormatOptions): string {
  return new Date(Date.now() - 86400000).toLocaleDateString("es-MX", { ...options, timeZone: "America/Mexico_City" });
}
