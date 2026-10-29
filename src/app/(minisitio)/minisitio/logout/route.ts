import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearCondominoSessionCookie } from "@/shared/application/auth/condomino-session";

/**
 * Cierra la sesión del condómino y vuelve al login. Lo usan el cierre por inactividad
 * (`?reason=inactivity`) y la revocación de acceso detectada en el servidor (`?reason=revoked`).
 */
export async function GET(request: NextRequest) {
  await clearCondominoSessionCookie();
  const reason = request.nextUrl.searchParams.get("reason");
  const target = new URL("/minisitio/login", request.url);
  if (reason === "inactivity" || reason === "revoked") target.searchParams.set("reason", reason);
  return NextResponse.redirect(target);
}
