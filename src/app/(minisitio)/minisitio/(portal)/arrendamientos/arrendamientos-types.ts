import type { Arrendamiento } from "@/modules/minisitio/infrastructure/queries/rentals.queries";

/**
 * Arrendamiento tal como lo consumen las vistas. La consulta tipa como `null` literal los
 * campos legacy que insulae2.0 no tiene (indiviso FAP/condominio, folio F-861); aquí se
 * ensanchan para conservar las ramas de la UI que los muestran cuando traen valor.
 */
export type ArrendamientoView = Omit<
  Arrendamiento,
  "indiviso_fap_condominio" | "folio_861" | "fecha_inscripcion_f861" | "fecha_vigencia_f861"
> & {
  indiviso_fap_condominio: number | null;
  folio_861: string | number | null;
  fecha_inscripcion_f861: string | null;
  fecha_vigencia_f861: string | null;
};

/** `parseFloat` del legacy, que recibía números, null o strings (en TS solo admite string). */
export const parseNum = (value: unknown): number => parseFloat(String(value));
