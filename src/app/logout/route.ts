import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Safely delete the session cookie inside a Route Handler
  cookieStore.delete("insulae_session");

  // Dynamically resolve base URL to redirect back to /login
  const redirectUrl = new URL("/login", request.url);
  
  return NextResponse.redirect(redirectUrl);
}
