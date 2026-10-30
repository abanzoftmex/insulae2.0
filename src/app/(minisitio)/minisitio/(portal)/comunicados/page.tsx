import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listComunicados } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { ComunicadosView } from "./comunicados-view";

export const metadata: Metadata = { title: "Avisos" };

/** Avisos (`/minisitio/comunicados`): el canal de comunicados de la administración. */
export default async function ComunicadosPage() {
  const session = await requireCondominoSession();

  // Si la consulta falla, la vista lo dice y ofrece reintentar (no es lo mismo que no haber avisos).
  const data = await listComunicados(session).catch((error) => {
    console.error("[minisitio] Avisos:", error);
    return null;
  });

  return <ComunicadosView comunicados={data?.comunicados ?? null} />;
}
