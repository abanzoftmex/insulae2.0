import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/shared/application/auth/admin-session";

/** Rutas que se sirven sin sesión (login y recuperación de contraseña). */
const PUBLIC_PATHS = new Set(["/login", "/olvide-contrasena", "/restablecer-contrasena"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets exclusions (like .css, .js, .png, favicon, etc)
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // La cookie solo cuenta si su firma es válida y no ha expirado. Un valor manipulado
  // (o el JSON plano del formato anterior) se trata como "sin sesión" y se borra.
  const rawCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = rawCookie ? await verifyAdminSession(rawCookie) : null;
  const hasStaleCookie = Boolean(rawCookie) && !session;

  // Check if it's a prefetch request (e.g. Next.js Link prefetching)
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch";

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
