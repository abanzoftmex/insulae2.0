import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/shared/application/auth/admin-session";
import { readAdminSession } from "@/shared/application/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * Borra una cookie de sesión del panel que el servidor ya no acepta (contraseña cambiada o
 * cuenta desactivada) y manda al login. Con una sesión válida solo regresa al inicio, para que
 * un enlace ajeno no pueda cerrar la sesión de nadie.
 */
export async function GET(request: NextRequest) {
  let valid;
  try {
    valid = await readAdminSession();
  } catch {
    // La base no respondió: no se sabe si la sesión sigue valiendo, así que no se borra.
    return NextResponse.redirect(new URL("/", request.url));
  }
  const res = NextResponse.redirect(new URL(valid ? "/" : "/login", request.url));
  if (!valid) res.cookies.delete(ADMIN_SESSION_COOKIE);
  return res;
}
