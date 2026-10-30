import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getRental } from "@/modules/minisitio/infrastructure/queries/rentals.queries";
import { ArrendamientoDetalleView } from "./arrendamiento-detalle-view";

export const metadata: Metadata = { title: "Comercio" };

export default async function ArrendamientoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCondominoSession();
  const { id } = await params;
  // null si el comercio no es del condómino: la vista muestra el error como antes.
  const result = await getRental(session, id);

  return <ArrendamientoDetalleView id={id} arrendamiento={result?.arrendamiento ?? null} />;
}
