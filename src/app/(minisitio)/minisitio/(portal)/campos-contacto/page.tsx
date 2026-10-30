import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listContactFields, type CampoContacto } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { CamposContactoView } from "./campos-contacto-view";

export const metadata: Metadata = { title: "Números de Emergencia" };

/** Información de contacto / números de emergencia (antes pages/campos-contacto.js). */
export default async function CamposContactoPage() {
  const session = await requireCondominoSession();

  // Si falla, la pantalla vieja mostraba la lista vacía.
  let campos: CampoContacto[] = [];
  try {
    const data = await listContactFields(session);
    if (data.success) campos = data.campos || [];
  } catch (error) {
    console.error("[minisitio] campos-contacto:", error);
  }

  return <CamposContactoView campos={campos} />;
}
