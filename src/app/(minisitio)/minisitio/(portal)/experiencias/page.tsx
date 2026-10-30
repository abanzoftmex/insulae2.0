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
    // Si la consulta falla, la vista lo dice y ofrece reintentar (antes mostraba "contenido de ejemplo").
    <ExperienciasView destacados={destacados?.comunicados ?? null} linkGaceta={meta.linkGaceta} />
  );
}
