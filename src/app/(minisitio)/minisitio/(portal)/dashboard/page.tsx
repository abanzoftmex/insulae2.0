import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listProperties } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { listRentals } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { SaldosView, type UnidadSaldo } from "./saldos-view";

export const metadata: Metadata = { title: "Mis saldos" };

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (units: UnidadSaldo[], key: "vencido" | "porVencer" | "aFavor") => round2(units.reduce((total, u) => total + u[key], 0));

/** Los textos de relleno de la consulta ("Sin barrio") no son datos: no se muestran. */
const PLACEHOLDERS = new Set(["Sin barrio", "Sin uso definido"]);
const detalle = (...parts: (string | null | undefined)[]) =>
  parts.filter((p): p is string => Boolean(p?.trim()) && !PLACEHOLDERS.has(p!.trim())).join(" · ");

/**
 * Mis saldos (`/minisitio/dashboard`): cuánto se debe y en qué unidad. Totales de propiedades y
 * comercios y la lista por unidad, cada una con su estado de cuenta a un clic. Si una consulta
 * falla, la pantalla lo dice en vez de pintar ceros.
 */
export default async function SaldosPage() {
  const session = await requireCondominoSession();

  const [propiedades, comercios] = await Promise.all([
    listProperties(session).catch((error) => {
      console.error("[minisitio] Mis saldos: propiedades:", error);
      return null;
    }),
    listRentals(session).catch((error) => {
      console.error("[minisitio] Mis saldos: comercios:", error);
      return null;
    }),
  ]);
  if (!propiedades || !comercios) return <SaldosView data={null} />;

  const unidades: UnidadSaldo[] = [
    ...propiedades.propiedades.map((p) => ({
      id: p.id_areas_privativas,
      tipo: "propiedad" as const,
      nombre: p.nombre,
      detalle: detalle(p.zona, p.uso_suelo),
      vencido: p.saldo_vencido,
      porVencer: round2(Math.max(0, p.saldo_pendiente - p.saldo_vencido)),
      aFavor: p.saldo_a_favor,
      href: `/propiedades/${p.id_areas_privativas}/estado-cuenta`,
    })),
    ...comercios.arrendamientos.map((r) => ({
      id: r.id_arrendamientos,
      tipo: "comercio" as const,
      nombre: r.nombre_comercio,
      detalle: detalle(r.area_privativa, r.barrio),
      vencido: r.saldo_vencido ?? 0,
      porVencer: r.saldo_pendiente_no_vencido ?? 0,
      aFavor: r.saldo_a_favor ?? 0,
      href: `/arrendamientos/${r.id_arrendamientos}/estado-cuenta`,
    })),
  ].sort((a, b) => b.vencido - a.vencido || b.porVencer - a.porVencer || a.nombre.localeCompare(b.nombre, "es", { numeric: true }));

  const deTipo = (tipo: UnidadSaldo["tipo"]) => unidades.filter((u) => u.tipo === tipo);
  const conteo = (tipo: UnidadSaldo["tipo"]) => ({ total: deTipo(tipo).length, conAdeudo: deTipo(tipo).filter((u) => u.vencido > 0).length });

  return (
    <SaldosView
      data={{
        unidades,
        resumen: {
          vencido: sum(unidades, "vencido"),
          porVencer: sum(unidades, "porVencer"),
          aFavor: sum(unidades, "aFavor"),
          propiedades: conteo("propiedad"),
          comercios: conteo("comercio"),
          m2: round2(propiedades.propiedades.reduce((total, p) => total + (p.m2_totales || 0), 0)),
          indiviso: propiedades.propiedades.reduce((total, p) => total + (p.indiviso || 0), 0),
        },
      }}
    />
  );
}
