import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listComunicados } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { ComunicadosView } from "./comunicados-view";

export const metadata: Metadata = { title: "Comunicados" };

/** Comunicados (`/minisitio/comunicados`, antes pages/comunicados.js). */
export default async function ComunicadosPage() {
  const session = await requireCondominoSession();

  // Como en el minisitio, si la consulta falla se muestra la lista vacía.
  const data = await listComunicados(session).catch((error) => {
    console.error("[minisitio] Comunicados:", error);
    return null;
  });

  return <ComunicadosView comunicados={data?.comunicados ?? []} />;
}
