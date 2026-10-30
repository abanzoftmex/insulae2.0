import type { Metadata } from "next";
import { requireCondominoSession } from "@/shared/application/auth/condomino-session";
import { getProfile, type Profile } from "@/modules/minisitio/infrastructure/queries/profile.queries";
import { MiPerfilView } from "./mi-perfil-view";

export const metadata: Metadata = { title: "Mi Perfil" };

/** Mi Perfil (antes pages/mi-perfil.js + GET /api/mi-perfil). */
export default async function MiPerfilPage() {
  const session = await requireCondominoSession();

  // Si falla, la pantalla vieja pintaba el perfil vacío (solo registraba el error).
  let perfil: Profile | null = null;
  try {
    perfil = await getProfile(session);
  } catch (error) {
    console.error("[minisitio] mi-perfil:", error);
  }

  return <MiPerfilView initialPerfil={perfil} />;
}
