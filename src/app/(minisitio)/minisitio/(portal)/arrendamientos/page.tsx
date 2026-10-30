import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listRentals } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { ArrendamientosView } from "./arrendamientos-view";

export const metadata: Metadata = { title: "Mis Comercios" };

export default async function ArrendamientosPage() {
  const session = await requireCondominoSession();
  const arrendamientos = await listRentals(session);

  return <ArrendamientosView initialData={arrendamientos} />;
}
