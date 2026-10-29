import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/shared/application/auth/admin-session";
import {
  CONDOMINO_SESSION_COOKIE,
  MINISITIO_BASE_PATH,
  verifyCondominoToken,
} from "@/shared/application/auth/condomino-token";

/** Rutas que se sirven sin sesión (login y recuperación de contraseña). */
const PUBLIC_PATHS = new Set(["/login", "/olvide-contrasena", "/restablecer-contrasena"]);

/** Pantallas del portal de condóminos que no requieren sesión. */
const MINISITIO_PUBLIC_PATHS = new Set(
  ["/login", "/forgot-password", "/reset-password", "/privacy", "/superadmin-insulae", "/logout"].map(
    (p) => `${MINISITIO_BASE_PATH}${p}`,
  ),
);

/**
 * Portal de condóminos (`/minisitio`): su sesión es independiente de la del panel (cookie
 * `minisitio_session`). Aquí solo se verifica la firma para redirigir temprano; cada página y
 * acción revalida contra la base con requireCondominoSession().
 */
async function minisitioGuard(request: NextRequest, isPrefetch: boolean): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  // Las server actions validan la sesión por su cuenta (y redirigen si hace falta).
  if (MINISITIO_PUBLIC_PATHS.has(pathname) || request.headers.has("next-action")) {
    return NextResponse.next();
  }

  const rawCookie = request.cookies.get(CONDOMINO_SESSION_COOKIE)?.value;
  const session = rawCookie ? await verifyCondominoToken(rawCookie) : null;
  if (session) return NextResponse.next();

  if (isPrefetch) {
    const res = new NextResponse("", { status: 200 });
    res.headers.set("x-middleware-cache", "no-cache");
    return res;
  }
  const res = NextResponse.redirect(new URL(`${MINISITIO_BASE_PATH}/login`, request.url));
  res.headers.set("x-middleware-cache", "no-cache");
  if (rawCookie) res.cookies.set(CONDOMINO_SESSION_COOKIE, "", { path: MINISITIO_BASE_PATH, maxAge: 0 });
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets exclusions (like .css, .js, .png, favicon, etc)
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check if it's a prefetch request (e.g. Next.js Link prefetching)
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch";

  if (pathname === MINISITIO_BASE_PATH || pathname.startsWith(`${MINISITIO_BASE_PATH}/`)) {
    return minisitioGuard(request, isPrefetch);
  }

  // La cookie solo cuenta si su firma es válida y no ha expirado. Un valor manipulado
  // (o el JSON plano del formato anterior) se trata como "sin sesión" y se borra.
  const rawCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = rawCookie ? await verifyAdminSession(rawCookie) : null;
  const hasStaleCookie = Boolean(rawCookie) && !session;

  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!session) {
    if (!isPublic) {
      if (isPrefetch) {
        // Return an empty 200 OK response for prefetch requests
        // This prevents the router from caching a 307 redirect, while keeping data secure.
        const res = new NextResponse("", { status: 200 });
        res.headers.set("x-middleware-cache", "no-cache");
        return res;
      }
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.headers.set("x-middleware-cache", "no-cache");
      if (hasStaleCookie) res.cookies.delete(ADMIN_SESSION_COOKIE);
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("x-middleware-cache", "no-cache");
    if (hasStaleCookie) res.cookies.delete(ADMIN_SESSION_COOKIE);
    return res;
  }

  // Con sesión válida, el login redirige al inicio.
  if (pathname === "/login") {
    const res = NextResponse.redirect(new URL("/", request.url));
    res.headers.set("x-middleware-cache", "no-cache");
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("x-middleware-cache", "no-cache");
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
