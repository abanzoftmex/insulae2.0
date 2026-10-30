import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listRentals } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { ArrendamientosView } from "./arrendamientos-view";

export const metadata: Metadata = { title: "Mis comercios" };

/** Mis comercios (`/minisitio/arrendamientos`). Si la consulta falla, la vista lo dice y ofrece reintentar. */
export default async function ArrendamientosPage() {
  const session = await requireCondominoSession();
  const arrendamientos = await listRentals(session).catch((error) => {
    console.error("[minisitio] Mis comercios:", error);
    return null;
  });

  return <ArrendamientosView data={arrendamientos} />;
}
