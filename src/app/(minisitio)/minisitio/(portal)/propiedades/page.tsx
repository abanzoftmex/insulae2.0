import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listProperties } from "@/modules/minisitio/infrastructure/queries/properties.queries";
import { getProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { PropiedadesView } from "./propiedades-view";

export const metadata: Metadata = { title: "Mis Propiedades" };

export default async function PropiedadesPage() {
  const session = await requireCondominoSession();
  const [propiedades, proyecto] = await Promise.all([
    listProperties(session),
    // El legacy toleraba que /api/proyecto fallara (seguía con el total de m² por defecto).
    getProjectInfo().catch((error) => {
      console.error("[minisitio] propiedades: getProjectInfo", error);
      return null;
    }),
  ]);

  return <PropiedadesView initialData={propiedades} proyecto={proyecto} />;
}
