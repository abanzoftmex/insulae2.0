import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listComunicadosRecientes } from "@/modules/minisitio/infrastructure/queries/communications.queries";
import { listContactFields } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { getProjectInfo } from "@/modules/minisitio/infrastructure/queries/project.queries";
import { WelcomePanel } from "./welcome-panel";

export const metadata: Metadata = { title: "Bienvenida" };

/** Bienvenida (`/minisitio`, antes pages/index.js + components/WelcomePanel.js). */
export default async function BienvenidaPage() {
  const session = await requireCondominoSession();

  // Como en el minisitio, si una sección falla se pinta vacía y el resto del panel sigue.
  const [recientes, contacto, proyecto] = await Promise.all([
    listComunicadosRecientes(session).catch((error) => {
      console.error("[minisitio] Bienvenida: comunicados recientes:", error);
      return null;
    }),
    listContactFields(session).catch((error) => {
      console.error("[minisitio] Bienvenida: campos de contacto:", error);
      return null;
    }),
    getProjectInfo().catch((error) => {
      console.error("[minisitio] Bienvenida: síntesis del aviso de privacidad:", error);
      return null;
    }),
  ]);

  return (
    <div className="space-y-6">
      <WelcomePanel
        comunicadosRecientes={recientes?.comunicados ?? []}
        camposContacto={contacto?.campos ?? []}
        sintesisAviso={proyecto?.sintesisAviso || ""}
      />
    </div>
  );
}
