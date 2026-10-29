import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import {
  getExperienciasMeta,
  listComunicadosDestacados,
} from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { ExperienciasView } from "./experiencias-view";

export const metadata: Metadata = { title: "Experiencias" };

/** Experiencias (`/minisitio/experiencias`, antes pages/experiencias.js). */
export default async function ExperienciasPage() {
  const session = await requireCondominoSession();

  const [destacados, meta] = await Promise.all([
    listComunicadosDestacados(session).catch((error) => {
      console.error("[minisitio] Experiencias: comunicados destacados:", error);
      return null;
    }),
    getExperienciasMeta(),
  ]);

  return (
    <ExperienciasView
      destacados={destacados?.comunicados ?? []}
      linkGaceta={meta.linkGaceta}
      // Mismo mensaje que mostraba el minisitio cuando fallaba la carga.
      error={destacados ? null : "Error al cargar los comunicados. Mostrando contenido de ejemplo."}
    />
  );
}
