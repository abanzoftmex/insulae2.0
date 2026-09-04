/**
 * Guardia de sesión para las rutas /api/condomino/* (portal de condóminos).
 *
 * En CADA petición: verifica la firma y vigencia del token y, además, consulta la base
 * para confirmar que el usuario sigue activo y conserva el rol "Solo Minisitio".
 * Así, si el administrador de Insulae revoca el rol o desactiva la cuenta, el acceso
 * cae en la siguiente petición, sin esperar a que expire el token.
 *
 * Contrato con el minisitio: cualquier 401 se interpreta como "sesión terminada" y
 * el cliente cierra sesión. Por eso un acceso revocado también responde 401, con
 * `code: "ACCESS_REVOKED"` para poder distinguirlo de un token inválido.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest, type CondominoTokenPayload } from "./condomino-token";
import { MINISITIO_ACCESS_DENIED_MESSAGE, minisitioRoleWhere } from "./condomino-access";

export type CondominoAuthResult =
  | { ok: true; session: CondominoTokenPayload }
  | { ok: false; response: NextResponse };

export async function requireCondomino(request: Request): Promise<CondominoAuthResult> {
  const session = getCondominoFromRequest(request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, code: "INVALID_TOKEN", message: "Token inválido o expirado." },
        { status: 401 },
      ),
    };
  }

  const stillAllowed = await prisma.user.count({
    where: {
      id: session.userId,
      condominiumId: session.condominiumId,
      isActive: true,
      userRoles: { some: { role: minisitioRoleWhere(session.condominiumId) } },
    },
  });

  if (stillAllowed === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, code: "ACCESS_REVOKED", message: MINISITIO_ACCESS_DENIED_MESSAGE },
        { status: 401 },
      ),
    };
  }

  return { ok: true, session };
}
