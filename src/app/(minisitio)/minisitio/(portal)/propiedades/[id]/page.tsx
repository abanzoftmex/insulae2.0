import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getPropertyDetail } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { PropiedadDetalleView } from "./propiedad-detalle-view";

export const metadata: Metadata = { title: "Propiedad" };

export default async function PropiedadDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCondominoSession();
  const { id } = await params;
  // null si la propiedad no es del condómino: la vista muestra "Propiedad no encontrada" como antes.
  const detail = await getPropertyDetail(session, id);

  return <PropiedadDetalleView id={id} detail={detail} />;
}
