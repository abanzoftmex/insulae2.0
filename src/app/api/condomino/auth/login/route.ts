/**
 * POST /api/condomino/auth/login
 * Login del portal de condóminos (minisitio). Valida email + password contra insulae2.0
 * y devuelve un token HMAC + datos básicos del usuario.
 *
 * Seguridad: RECHAZA cuentas sin passwordHash y NO acepta las contraseñas por defecto
 * que usa el login administrativo (eso es solo para el panel interno).
 *
 * Acceso: solo entran usuarios con el rol "Solo Minisitio" (ver condomino-access.ts),
 * sin importar si son propietarios, arrendatarios o ambos.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { signCondominoToken } from "@/shared/application/auth/condomino-token";
import { MINISITIO_ACCESS_DENIED_MESSAGE, minisitioRoleWhere } from "@/shared/application/auth/condomino-access";

export const dynamic = "force-dynamic";

function hashSHA256(t: string) {
  return crypto.createHash("sha256").update(t).digest("hex");
}
function hashMD5(t: string) {
  return crypto.createHash("md5").update(t).digest("hex");
}

export async function POST(request: NextRequest) {
  const condo = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true },
  });
  if (!condo) {
    return NextResponse.json({ success: false, message: "Servicio no disponible." }, { status: 503 });
  }

  let body: { email?: string; username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Solicitud inválida." }, { status: 400 });
  }

  const email = (body?.email || body?.username || "").trim();
  const password = (body?.password || "").trim();
  if (!email || !password) {
    return NextResponse.json({ success: false, message: "Ingresa tu correo y contraseña." }, { status: 400 });
  }

  // Un email puede estar compartido por varios usuarios (dato legacy). Traemos a todos
  // los candidatos y desambiguamos por la contraseña que coincide.
  const candidates = await prisma.user.findMany({
    where: {
      condominiumId: condo.id,
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { personalEmail: { equals: email, mode: "insensitive" } },
        { businessEmail: { equals: email, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      isActive: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      businessName: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      userType: true,
      assignments: { where: { isActive: true }, select: { id: true } },
      // Solo el rol del minisitio: si viene vacío, el usuario no tiene acceso al portal.
      userRoles: { where: { role: minisitioRoleWhere(condo.id) }, select: { id: true }, take: 1 },
    },
  });

  if (candidates.length === 0) {
    return NextResponse.json({ success: false, message: "Credenciales incorrectas." }, { status: 401 });
  }

  const activos = candidates.filter((u) => u.isActive);
  if (activos.length === 0) {
    return NextResponse.json({ success: false, message: "Tu cuenta está inactiva. Contacta al administrador." }, { status: 403 });
  }

  const matchPassword = (h: string | null) =>
    !!h && (h === password || h === hashSHA256(password) || h === hashMD5(password));

  // Los usuarios cuya contraseña coincide (resuelve emails compartidos).
  const matched = activos.filter((u) => matchPassword(u.passwordHash));
  if (matched.length === 0) {
    if (activos.some((u) => u.passwordHash)) {
      return NextResponse.json({ success: false, message: "Credenciales incorrectas." }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, message: "Aún no has configurado tu contraseña. Usa “¿Olvidaste tu contraseña?” para activarla." },
      { status: 403 }
    );
  }

  // Solo entra al minisitio quien tiene el rol "Solo Minisitio" (propietario o arrendatario por igual).
  const user = matched.find((u) => u.userRoles.length > 0);
  if (!user) {
    return NextResponse.json({ success: false, message: MINISITIO_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  // Indicadores de tipo (propietario / arrendatario / both)
  const rentalCount = await prisma.rental.count({
    where: {
      condominiumId: condo.id,
      OR: [{ administrativeContactUserId: user.id }, { operativeContactUserId: user.id }],
    },
  });
  const hasPropiedades = user.assignments.length > 0;
  const hasComerciosArrendamientos = rentalCount > 0;
  const userType =
    hasPropiedades && hasComerciosArrendamientos
      ? "both"
      : hasComerciosArrendamientos
      ? "arrendatario"
      : "propietario";

  const token = signCondominoToken({ userId: user.id, condominiumId: condo.id });
  const loginEmail = user.email || user.personalEmail || user.businessEmail || null;

  return NextResponse.json({
    success: true,
    token,
    user: {
      id: user.id,
      id_directorio: user.id, // alias de compatibilidad con el minisitio
      email: loginEmail,
      nombre: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.businessName || "Condómino",
      userType,
    },
    userIndicators: { hasPropiedades, hasComerciosArrendamientos },
  });
}
