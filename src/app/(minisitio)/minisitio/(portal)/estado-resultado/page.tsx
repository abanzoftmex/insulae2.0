import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import {
  getEstadoResultadoEgresosGrupos,
  getEstadoResultadoIngresos,
  getEstadoResultadoTotales,
  getFinancialYears,
} from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { requirePropietario } from "../_reportes/require-propietario";
import { EstadoResultadoView } from "./estado-resultado-view";

export const metadata: Metadata = { title: "Estado de Resultados" };

/** Años que ofrecía el selector del minisitio; se conservan junto a los años con movimientos. */
const ANIOS_DEL_MINISITIO = [2023, 2024, 2025];

export default async function EstadoResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string | string[] }>;
}) {
  const session = await requireCondominoSession();
  await requirePropietario(session);

  const { anio } = await searchParams;

  // Año: el de la URL si viene, o el más reciente con ingresos o egresos. Cambiarlo es navegar:
  // la vista hace router.push(?anio=) y esta página vuelve a consultar.
  const yr = await getFinancialYears(session).catch(() => null);
  let year = parseInt(String(Array.isArray(anio) ? anio[0] : (anio ?? "")), 10);
  if (!year || Number.isNaN(year)) {
    year = yr?.latest || new Date().getFullYear();
  }

  // Totales, ingresos y grupos de egresos del mismo año; cada sección puede fallar por separado.
  const [totales, ingresos, egresos] = await Promise.allSettled([
    getEstadoResultadoTotales(session, year),
    getEstadoResultadoIngresos(session, year),
    getEstadoResultadoEgresosGrupos(session, year),
  ]);
  for (const r of [totales, ingresos, egresos]) {
    if (r.status === "rejected") console.error("[minisitio] estado-resultado:", r.reason);
  }

  const data =
    totales.status === "fulfilled"
      ? {
          totales: totales.value,
          ingresos: ingresos.status === "fulfilled" ? ingresos.value.ingresos : null,
          egresos: egresos.status === "fulfilled" ? egresos.value.egresos : null,
          ingresosError: ingresos.status === "rejected",
          egresosError: egresos.status === "rejected",
        }
      : null;
  const anios = [...new Set([...(yr?.anios ?? []), ...ANIOS_DEL_MINISITIO, year])].sort((a, b) => a - b);

  return <EstadoResultadoView data={data} anio={year} anios={anios} anioEnCurso={yr?.currentYear ?? new Date().getFullYear()} />;
}
