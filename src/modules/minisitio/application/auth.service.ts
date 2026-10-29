/**
 * Autenticación del portal de condóminos: login, datos de sesión, recuperación de contraseña
 * y suplantación (modo superadmin). Lógica portada de las rutas /api/condomino/auth/* y
 * /api/dev/impersonate, que ya no existen: ahora se llama en el mismo proceso.
 *
 * Seguridad: RECHAZA cuentas sin passwordHash y NO acepta las contraseñas por defecto.
 * Acceso: cuenta activa y (ADMIN, rol del minisitio, área privativa activa o contrato de
 * arrendamiento) — ver condomino-access.ts.
 */
import crypto from "crypto";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { MINISITIO_ACCESS_DENIED_MESSAGE, minisitioRoleWhere } from "@/shared/application/auth/condomino-access";
import { signResetToken, verifyResetToken, type CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { getMinisitioCondominium } from "../infrastructure/condominium";
import { MINISITIO_MAIL_FROM, sendMinisitioEmail } from "../infrastructure/mailer";
import type { MinisitioSessionInfo, MinisitioUserType, UserIndicators } from "../domain/types";

function hashSHA256(t: string) {
  return crypto.createHash("sha256").update(t).digest("hex");
}
function hashMD5(t: string) {
  return crypto.createHash("md5").update(t).digest("hex");
}

type AuthFailure = { ok: false; message: string };

async function countRentals(condominiumId: string, userId: string): Promise<number> {
  return prisma.rental.count({
    where: { condominiumId, OR: [{ administrativeContactUserId: userId }, { operativeContactUserId: userId }] },
  });
}

function resolveUserType(indicators: UserIndicators): MinisitioUserType {
  const { hasPropiedades, hasComerciosArrendamientos } = indicators;
  if (hasPropiedades && hasComerciosArrendamientos) return "both";
  return hasComerciosArrendamientos ? "arrendatario" : "propietario";
}

function buildSessionInfo(
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    businessName: string | null;
    email: string | null;
    personalEmail: string | null;
    businessEmail: string | null;
  },
  indicators: UserIndicators,
): MinisitioSessionInfo {
  return {
    user: {
      id: user.id,
      id_directorio: user.id,
      nombre: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.businessName || "Condómino",
      apaterno: "",
      amaterno: "",
      email: user.email || user.personalEmail || user.businessEmail || null,
      telefono: null,
      direccion: null,
      razon_social: null,
      id_cat_tipos_directorio: null,
      userType: resolveUserType(indicators),
      aceptoAvisoPrivacidad: true,
    },
    userIndicators: indicators,
  };
}

/** Valida correo + contraseña. Un correo puede estar compartido (dato legacy): desambigua por contraseña. */
export async function authenticateCondomino(
  emailInput: string,
  passwordInput: string,
): Promise<{ ok: true; session: { userId: string; condominiumId: string }; info: MinisitioSessionInfo } | AuthFailure> {
  const condo = await getMinisitioCondominium();
  if (!condo) return { ok: false, message: "Servicio no disponible." };

  const email = (emailInput || "").trim();
  const password = (passwordInput || "").trim();
  if (!email || !password) return { ok: false, message: "Ingresa tu correo y contraseña." };

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
      // Solo el rol del minisitio: si viene vacío, el usuario no tiene ese rol.
      userRoles: { where: { role: minisitioRoleWhere(condo.id) }, select: { id: true }, take: 1 },
    },
  });

  if (candidates.length === 0) return { ok: false, message: "Credenciales incorrectas." };

  const activos = candidates.filter((u) => u.isActive);
  if (activos.length === 0) return { ok: false, message: "Tu cuenta está inactiva. Contacta al administrador." };

  const matchPassword = (h: string | null) =>
    !!h && (h === password || h === hashSHA256(password) || h === hashMD5(password));

  const matched = activos.filter((u) => matchPassword(u.passwordHash));
  if (matched.length === 0) {
    if (activos.some((u) => u.passwordHash)) return { ok: false, message: "Credenciales incorrectas." };
    return {
      ok: false,
      message: "Aún no has configurado tu contraseña. Usa “¿Olvidaste tu contraseña?” para activarla.",
    };
  }

  // Permitir si es ADMIN, tiene rol autorizado, o tiene áreas privativas activas (propietario)
  let user = matched.find((u) => u.userType === "ADMIN" || u.userRoles.length > 0 || u.assignments.length > 0);
  if (!user) {
    // Sin asignaciones directas: ¿tiene contratos de arrendamiento en el condominio?
    for (const cand of matched) {
      if ((await countRentals(condo.id, cand.id)) > 0) {
        user = cand;
        break;
      }
    }
  }
  if (!user) return { ok: false, message: MINISITIO_ACCESS_DENIED_MESSAGE };

  // Auto-sanación: acceso legítimo sin la fila en UserRole → se vincula el rol del minisitio.
  if (user.userRoles.length === 0) {
    try {
      const minisitioRole = await prisma.role.findFirst({
        where: minisitioRoleWhere(condo.id),
        orderBy: { createdAt: "asc" },
      });
      if (minisitioRole) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: minisitioRole.id } },
          create: { userId: user.id, roleId: minisitioRole.id },
          update: {},
        });
      }
    } catch (err) {
      console.error("[Minisitio Login] Error auto-linking role:", err);
    }
  }

  const rentalCount = await countRentals(condo.id, user.id);
  const info = buildSessionInfo(user, {
    hasPropiedades: user.assignments.length > 0,
    hasComerciosArrendamientos: rentalCount > 0,
  });

  return { ok: true, session: { userId: user.id, condominiumId: condo.id }, info };
}

/** Datos del condómino de la sesión (antes GET /api/condomino/auth/me). */
export async function getSessionInfo(session: CondominoTokenPayload): Promise<MinisitioSessionInfo | null> {
  const user = await prisma.user.findFirst({
    where: { id: session.userId, condominiumId: session.condominiumId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      businessName: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      assignments: { where: { isActive: true }, select: { id: true } },
    },
  });
  if (!user) return null;

  const rentalCount = await countRentals(session.condominiumId, user.id);
  return buildSessionInfo(user, {
    hasPropiedades: user.assignments.length > 0,
    hasComerciosArrendamientos: rentalCount > 0,
  });
}

/** Usuario a suplantar desde el modo superadmin (antes POST /api/dev/impersonate). */
export async function getImpersonationTarget(
  userId: string,
): Promise<{ ok: true; session: { userId: string; condominiumId: string }; info: MinisitioSessionInfo } | AuthFailure> {
  const condo = await getMinisitioCondominium();
  if (!condo) return { ok: false, message: "Condominio no encontrado." };

  const id = (userId || "").trim();
  if (!id) return { ok: false, message: "Falta el identificador del usuario." };

  const session = { userId: id, condominiumId: condo.id };
  const info = await getSessionInfo({ ...session, exp: 0 });
  if (!info) return { ok: false, message: "Usuario no encontrado o inactivo." };
  return { ok: true, session, info };
}

// ---- Recuperación de contraseña ----

export const FORGOT_PASSWORD_GENERIC_MESSAGE =
  "Se ha enviado un enlace a tu correo electrónico para cambiar tu contraseña. Revisa tu bandeja de entrada y sigue las instrucciones.";

/**
 * Si existe un usuario activo con ese correo y con el rol del minisitio, le envía el enlace
 * de restablecimiento (1 h). Nunca revela si el correo existe.
 */
export async function requestPasswordReset(emailInput: string, origin: string): Promise<void> {
  const email = (emailInput || "").trim();
  if (!email) return;

  const condominium = await getMinisitioCondominium();
  if (!condominium) return;

  const user = await prisma.user.findFirst({
    where: {
      condominiumId: condominium.id,
      isActive: true,
      userRoles: { some: { role: minisitioRoleWhere(condominium.id) } },
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { personalEmail: { equals: email, mode: "insensitive" } },
        { businessEmail: { equals: email, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, personalEmail: true, businessEmail: true },
  });
  if (!user) return;

  const loginEmail = user.email || user.personalEmail || user.businessEmail || email;
  const token = await signResetToken({ userId: user.id, email: loginEmail });
  const resetLink = `${origin}/minisitio/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendMinisitioEmail({
      from: MINISITIO_MAIL_FROM,
      to: [email],
      subject: "Restablecer tu contraseña - Val'Quirico",
      html: resetEmailHtml(resetLink),
    });
  } catch (error) {
    // No revelar detalles al usuario; igual se responde con el mensaje genérico.
    console.error("[minisitio] Error enviando email de reset:", error);
  }
}

export async function validateResetToken(token: string): Promise<{ valid: true; email: string } | { valid: false; message: string }> {
  const payload = await verifyResetToken(token);
  if (!payload) return { valid: false, message: "El enlace es inválido o expiró. Solicita uno nuevo." };
  return { valid: true, email: payload.email };
}

export async function resetPassword(token: string, newPasswordInput: string): Promise<{ ok: true; message: string } | AuthFailure> {
  const payload = await verifyResetToken(token);
  if (!payload) return { ok: false, message: "El enlace es inválido o expiró. Solicita uno nuevo." };

  const newPassword = (newPasswordInput || "").trim();
  if (newPassword.length < 8) return { ok: false, message: "La contraseña debe tener al menos 8 caracteres" };

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
  if (!user) return { ok: false, message: "Usuario no encontrado" };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashSHA256(newPassword) } });
  return { ok: true, message: "Contraseña actualizada exitosamente" };
}

function resetEmailHtml(resetLink: string): string {
  return `
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>Restablecer Contraseña</title>
        <style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
          .container{max-width:600px;margin:0 auto;padding:20px}
          .header{background:linear-gradient(135deg,#cba258,#cba258);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}
          .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
          .button{display:inline-block;background:linear-gradient(135deg,#cba258,#cba258);color:#fff;padding:15px 30px;text-decoration:none;border-radius:5px;margin:20px 0;font-weight:bold}
          .footer{text-align:center;margin-top:30px;color:#666;font-size:12px}
        </style></head><body>
          <div class="container">
            <div class="header"><h1>VAL'QUIRICO</h1><p>Portal del Condómino</p></div>
            <div class="content">
              <h2>Restablecer tu contraseña</h2>
              <p>Hola,</p>
              <p>Recibimos una solicitud para restablecer tu contraseña. Si no fuiste tú, ignora este correo.</p>
              <a href="${resetLink}" class="button">Restablecer Contraseña</a>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p><a href="${resetLink}">${resetLink}</a></p>
              <p><strong>Este enlace expira en 1 hora.</strong></p>
              <p>Saludos,<br>El equipo de Val'Quirico</p>
            </div>
            <div class="footer"><p>© ${new Date().getFullYear()} Val'Quirico. Correo automático, no respondas a este mensaje.</p></div>
          </div>
        </body></html>`;
}
