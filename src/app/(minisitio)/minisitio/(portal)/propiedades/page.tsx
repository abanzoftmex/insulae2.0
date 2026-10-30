import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listProperties } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { getProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { PropiedadesView } from "./propiedades-view";

export const metadata: Metadata = { title: "Mis propiedades" };

/**
 * Mis propiedades (`/minisitio/propiedades`). Quien no tiene propiedades ve el estado vacío (antes
 * se le redirigía desde el navegador). Si la consulta falla, la vista lo dice y ofrece reintentar.
 */
export default async function PropiedadesPage() {
  const session = await requireCondominoSession();
  const [propiedades, proyecto] = await Promise.all([
    listProperties(session).catch((error) => {
      console.error("[minisitio] Mis propiedades:", error);
      return null;
    }),
    // Sin el proyecto solo se pierde el total de m² de la explicación del indiviso y del PDF.
    getProjectInfo().catch((error) => {
      console.error("[minisitio] Mis propiedades: proyecto:", error);
      return null;
    }),
  ]);

  return <PropiedadesView data={propiedades} proyecto={proyecto} />;
}
