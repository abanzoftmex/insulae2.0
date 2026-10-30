import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listContactFields } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { toContacto } from "../_lib/contactos";
import { CamposContactoView } from "./campos-contacto-view";

export const metadata: Metadata = { title: "Teléfonos de emergencia" };

/**
 * Teléfonos de emergencia y contacto (`/minisitio/campos-contacto`). Si la consulta falla, la
 * pantalla lo dice: es justo la que no puede quedarse vacía sin avisar.
 */
export default async function CamposContactoPage() {
  const session = await requireCondominoSession();
  const contactos = await listContactFields(session)
    .then((data) => data.campos.map(toContacto))
    .catch((error) => {
      console.error("[minisitio] Teléfonos de emergencia:", error);
      return null;
    });

  return <CamposContactoView contactos={contactos} />;
}
