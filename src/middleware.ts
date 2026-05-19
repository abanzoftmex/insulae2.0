import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("insulae_session");
  const { pathname } = request.nextUrl;

  // Static assets exclusions (like .css, .js, .png, favicon, etc)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if it's a prefetch request (e.g. Next.js Link prefetching)
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";

  // If there is no active session
  if (!sessionCookie) {
    if (pathname !== "/login") {
      if (isPrefetch) {
        // Return 401 to prevent the router from caching a 307 redirect
        const res = new NextResponse(null, { status: 401 });
        res.headers.set("x-middleware-cache", "no-cache");
        return res;
      }
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.headers.set("x-middleware-cache", "no-cache");
      return res;
    }
  } else {
    // If session exists and trying to access login page
    if (pathname === "/login") {
      const res = NextResponse.redirect(new URL("/", request.url));
      res.headers.set("x-middleware-cache", "no-cache");
      return res;
    }
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
