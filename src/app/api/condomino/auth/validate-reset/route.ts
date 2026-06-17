/**
 * POST /api/condomino/auth/validate-reset  { token } → { valid, email }
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyResetToken } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, message: "Solicitud inválida." }, { status: 400 });
  }

  const payload = verifyResetToken(body?.token);
  if (!payload) {
    return NextResponse.json({ valid: false, message: "El enlace es inválido o expiró. Solicita uno nuevo.", expired: true }, { status: 400 });
  }
  return NextResponse.json({ valid: true, email: payload.email, message: "Token válido" });
}
