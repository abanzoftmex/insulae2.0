import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getGeneralReport } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { requirePropietario } from "../_reportes/require-propietario";
import { ReporteGeneralView } from "./reporte-general-view";

export const metadata: Metadata = { title: "Reporte General" };

export default async function ReporteGeneralPage() {
  const session = await requireCondominoSession();
  await requirePropietario(session);

  // Si la carga falla, la vista lo dice y ofrece reintentar (antes mostraba "todas las áreas
  // están al corriente").
  const report = await getGeneralReport(session).catch((error) => {
    console.error("[minisitio] reporte-general:", error);
    return null;
  });

  return <ReporteGeneralView report={report} />;
}
