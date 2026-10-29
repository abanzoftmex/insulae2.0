import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getGeneralReport, type GeneralReport } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { requirePropietario } from "../_reportes/require-propietario";
import { ReporteGeneralView } from "./reporte-general-view";

export const metadata: Metadata = { title: "Reporte General" };

export default async function ReporteGeneralPage() {
  const session = await requireCondominoSession();
  await requirePropietario(session);

  // Igual que la pantalla vieja: si la carga falla se muestra el estado vacío.
  let report: GeneralReport | null = null;
  try {
    report = await getGeneralReport(session);
  } catch (error) {
    console.error("[minisitio] reporte-general:", error);
  }

  return <ReporteGeneralView initialAreas={report?.areas || []} initialEstadisticas={report?.estadisticas || {}} />;
}
