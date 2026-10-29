import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import {
  getEstadoResultadoEgresosGrupos,
  getEstadoResultadoIngresos,
  getEstadoResultadoTotales,
  getFinancialYears,
} from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { requirePropietario } from "../_reportes/require-propietario";
import { EstadoResultadoView, type EstadoResultadoInitialData } from "./estado-resultado-view";

export const metadata: Metadata = { title: "Estado de Resultados" };

export default async function EstadoResultadoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string | string[] }>;
}) {
  const session = await requireCondominoSession();
  await requirePropietario(session);

  const { anio } = await searchParams;

  // Año: el de la URL si viene, o el más reciente con datos reales (igual que la pantalla vieja)
  let year = parseInt(String(Array.isArray(anio) ? anio[0] : (anio ?? "")), 10);
  if (!year || Number.isNaN(year)) {
    const yr = await getFinancialYears(session).catch(() => null);
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

  const initialData: EstadoResultadoInitialData | null =
    totales.status === "fulfilled"
      ? {
          totales: totales.value,
          ingresos: ingresos.status === "fulfilled" ? ingresos.value.ingresos : null,
          egresos: egresos.status === "fulfilled" ? egresos.value.egresos : null,
          ingresosError: ingresos.status === "rejected" ? "Error cargando ingresos" : null,
          egresosError: egresos.status === "rejected" ? "Error cargando egresos" : null,
        }
      : null;

  return (
    <EstadoResultadoView
      initialData={initialData}
      initialError={initialData ? null : "Error al obtener totales"}
    />
  );
}
