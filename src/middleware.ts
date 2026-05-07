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

  // If there is no active session
  if (!sessionCookie) {
    if (pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else {
    // If session exists and trying to access login page
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
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
