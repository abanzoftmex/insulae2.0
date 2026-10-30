import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { listContactFields } from "@/modules/minisitio/infrastructure/queries/documents.queries";
import { getProfile } from "@/modules/minisitio/infrastructure/queries/profile.queries";
import { MiPerfilView } from "./mi-perfil-view";

export const metadata: Metadata = { title: "Mi perfil" };

/**
 * Mi perfil (`/minisitio/mi-perfil`). El correo de la administración (de los contactos del
 * condominio) sirve para mandar la constancia fiscal: el portal todavía no recibe archivos.
 */
export default async function MiPerfilPage() {
  const session = await requireCondominoSession();
  const [perfil, correoAdministracion] = await Promise.all([
    getProfile(session).catch((error) => {
      console.error("[minisitio] Mi perfil:", error);
      return null;
    }),
    listContactFields(session)
      .then((data) => data.campos.find((c) => c.tipo_id === 2 || /@/.test(c.contenido ?? ""))?.contenido?.trim() ?? null)
      .catch(() => null),
  ]);

  return <MiPerfilView perfil={perfil} correoAdministracion={correoAdministracion} />;
}
