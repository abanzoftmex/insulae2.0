import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getFeesReport } from "@/modules/minisitio/infrastructure/queries/reports.queries";
import { requirePropietario } from "../_reportes/require-propietario";
import { ReporteCuotas } from "../_reportes/reporte-cuotas";

export const metadata: Metadata = { title: "Reporte de Cuotas Extraordinarias" };

/** Áreas por página al abrir (la consulta acepta hasta 50). */
const LIMITE_INICIAL = 30;

export default async function Page() {
  const session = await requireCondominoSession();
  await requirePropietario(session);

  // Si la carga falla, la vista lo dice y ofrece reintentar.
  const inicial = await getFeesReport(session, { tipo: "extraordinaria", page: 1, limit: LIMITE_INICIAL }).catch((error) => {
    console.error("[minisitio] reporte-cuotas-extraordinaria:", error);
    return null;
  });

  return <ReporteCuotas tipo="extraordinaria" inicial={inicial} limiteInicial={LIMITE_INICIAL} anioEnCurso={new Date().getFullYear()} />;
}
