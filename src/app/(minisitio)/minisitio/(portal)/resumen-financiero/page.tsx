import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getFinancialYears, getResumenFinanciero } from "@/modules/minisitio/infrastructure/queries/financials.queries";
import { ResumenFinancieroView, type DatosAnio } from "./resumen-financiero-view";
import { pickVisibleYears } from "./visible-years";

export const metadata: Metadata = { title: "Resumen Financiero" };

export default async function ResumenFinancieroPage() {
  const session = await requireCondominoSession();

  // 1) Años con datos reales → tríptico de los 3 más recientes.
  const dataAnios = await getFinancialYears(session).catch((e) => {
    console.error("[minisitio] resumen-financiero (años):", e);
    return null;
  });
  const { visibles, seleccionado } = pickVisibleYears(dataAnios);

  // 2) Un ejercicio por consulta: los 3 en paralelo.
  let datosPorAnio: Record<number, DatosAnio> = {};
  let initialError: string | null = null;
  try {
    const entradas = await Promise.all(
      visibles.map(async (year) => [year, await getResumenFinanciero(session, year)] as const),
    );
    datosPorAnio = Object.fromEntries(entradas);
  } catch (e) {
    console.error("[minisitio] resumen-financiero:", e);
    initialError = "Error al cargar los datos financieros. Por favor, intenta de nuevo.";
  }

  return (
    <ResumenFinancieroView
      initialAnios={visibles}
      initialAnio={seleccionado}
      initialDatosPorAnio={datosPorAnio}
      initialError={initialError}
    />
  );
}
