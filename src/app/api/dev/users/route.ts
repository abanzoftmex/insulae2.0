/**
 * Endpoint de DESARROLLO — SOLO LOCALHOST.
 *
 *   GET  /api/dev/users            → lista usuarios del condominio (con estado de password y asignaciones)
 *        ?condominos=1             → solo usuarios con asignación (condóminos)
 *        ?q=texto                  → filtra por nombre / email / id
 *
 *   POST /api/dev/users            → fija contraseña con el ESTÁNDAR del login (sha256 hex)
 *        body: { "userId": "..." , "password": "..." }   ó
 *              { "email":  "..." , "password": "..." }
 *
 * Bloqueado en producción y para hosts que no sean localhost.
 * Útil para preparar credenciales de demo. NO exponer en deploy.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";

export const dynamic = "force-dynamic";

// Mismo estándar que loginAction() en src/app/actions/auth.ts
function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function classifyHash(hash: string | null): string {
  if (!hash) return "none";
  if (/^\$2[aby]\$/.test(hash)) return "bcrypt";
  if (/^[0-9a-f]{64}$/i.test(hash)) return "sha256";
  if (/^[0-9a-f]{40}$/i.test(hash)) return "sha1";
  if (/^[0-9a-f]{32}$/i.test(hash)) return "md5";
  return `other(len=${hash.length})`;
}

function assertLocalhost(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Endpoint deshabilitado en producción." }, { status: 403 });
  }
  const host = (request.headers.get("host") || "").split(":")[0];
  const allowed = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host);
  if (!allowed) {
    return NextResponse.json({ error: `Solo accesible desde localhost (host recibido: "${host}").` }, { status: 403 });
  }
  return null;
}

async function getCondominiumId(): Promise<string | null> {
  const c = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true },
  });
  return c?.id ?? null;
}

export async function GET(request: NextRequest) {
  const blocked = assertLocalhost(request);
  if (blocked) return blocked;

  const condoId = await getCondominiumId();
  if (!condoId) return NextResponse.json({ error: "Condominio no encontrado." }, { status: 404 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const onlyCondominos = url.searchParams.get("condominos") === "1";

  const users = await prisma.user.findMany({
    where: { condominiumId: condoId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      businessName: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      userType: true,
      isActive: true,
      passwordHash: true,
      assignments: {
        where: { isActive: true },
        select: { roleName: true, privateArea: { select: { name: true, code: true } } },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  let rows = users.map((u) => ({
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.businessName || "(sin nombre)",
    loginEmail: u.email || u.personalEmail || u.businessEmail || null,
    allEmails: [u.email, u.personalEmail, u.businessEmail].filter(Boolean),
    userType: u.userType,
    isActive: u.isActive,
    hasPassword: !!u.passwordHash,
    passwordFormat: classifyHash(u.passwordHash),
    isCondomino: u.assignments.length > 0,
    assignments: u.assignments.map((a) => ({ role: a.roleName, area: a.privateArea?.name || a.privateArea?.code || null })),
  }));

  if (onlyCondominos) rows = rows.filter((r) => r.isCondomino);
  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.loginEmail || "").toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    condominium: PROJECT_SCOPE.condominiumName,
    standard: "passwordHash = sha256(password.trim()) en hex — compatible con loginAction()",
    total: rows.length,
    canLogin: rows.filter((r) => r.loginEmail && r.hasPassword).length,
    users: rows,
  });
}

export async function POST(request: NextRequest) {
  const blocked = assertLocalhost(request);
  if (blocked) return blocked;

  const condoId = await getCondominiumId();
  if (!condoId) return NextResponse.json({ error: "Condominio no encontrado." }, { status: 404 });

  let body: { userId?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const { userId, email, password } = body || {};
  if (!password || typeof password !== "string" || password.trim().length < 4) {
    return NextResponse.json({ error: "Falta 'password' (mínimo 4 caracteres)." }, { status: 400 });
  }
  if (!userId && !email) {
    return NextResponse.json({ error: "Indica 'userId' o 'email'." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      condominiumId: condoId,
      ...(userId
        ? { id: userId }
        : {
            OR: [
              { email: { equals: email!, mode: "insensitive" } },
              { personalEmail: { equals: email!, mode: "insensitive" } },
              { businessEmail: { equals: email!, mode: "insensitive" } },
            ],
          }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      isActive: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado en el condominio." }, { status: 404 });

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashSHA256(password.trim()) },
  });

  const loginEmail = user.email || user.personalEmail || user.businessEmail || null;
  return NextResponse.json({
    ok: true,
    message: "Contraseña fijada (estándar SHA256). El usuario ya puede iniciar sesión por email.",
    user: {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "(sin nombre)",
      loginEmail,
      isActive: user.isActive,
    },
    warning: loginEmail ? undefined : "Este usuario NO tiene email; el login por email no funcionará hasta asignarle uno.",
  });
}
