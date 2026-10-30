import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getDashboardSummary } from "@/modules/minisitio/infrastructure/queries/dashboard.queries";
import { listRentals } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Panel de Control" };

/** Panel de Control (`/minisitio/dashboard`, antes pages/dashboard.js). */
export default async function DashboardPage() {
  const session = await requireCondominoSession();

  // Como en el minisitio, un fallo deja la sección en ceros en vez de romper la pantalla.
  const [summary, rentals] = await Promise.all([
    getDashboardSummary(session).catch((error) => {
      console.error("[minisitio] Dashboard: resumen:", error);
      return null;
    }),
    listRentals(session).catch((error) => {
      console.error("[minisitio] Dashboard: arrendamientos:", error);
      return null;
    }),
  ]);

  return <DashboardView summary={summary} rentals={rentals} />;
}
