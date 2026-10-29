import { redirect } from "next/navigation";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { getSessionInfo } from "@/modules/minisitio/application/auth.service";
import { msPath } from "@/components/minisitio/paths";

/**
 * Los reportes condominales son solo para propietarios (`propietario` | `both`). Las pantallas
 * viejas lo validaban en el cliente (pintaban "Acceso Denegado" y mandaban al dashboard); aquí
 * se valida en el servidor ANTES de cargar los datos del condominio, para no enviarlos a quien
 * no debe verlos. Mismo destino que antes: `/dashboard`.
 */
export async function requirePropietario(session: CondominoTokenPayload): Promise<void> {
  const info = await getSessionInfo(session);
  if (!info) redirect(msPath("/logout?reason=revoked"));
  const { userType } = info.user;
  if (userType !== "propietario" && userType !== "both") redirect(msPath("/dashboard"));
}
