/**
 * Autenticación del portal de condóminos: login, datos de sesión, recuperación de contraseña
 * y suplantación (modo superadmin). Lógica portada de las rutas /api/condomino/auth/* y
 * /api/dev/impersonate, que ya no existen: ahora se llama en el mismo proceso.
 *
 * Seguridad: RECHAZA cuentas sin passwordHash y NO acepta las contraseñas por defecto.
 * Contraseñas con scrypt (password-hash.ts); mientras no se verifica la contraseña todos los
 * errores dan el mismo mensaje, y los intentos se limitan por correo e IP (auth-throttle.ts).
 * Acceso: cuenta activa y (ADMIN, rol del minisitio, área privativa activa o contrato de
 * arrendamiento) — ver condomino-access.ts.
 */
import { after } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import {
  MINISITIO_ACCESS_DENIED_MESSAGE,
  minisitioOnlyRoleWhere,
  minisitioRoleWhere,
} from "@/shared/application/auth/condomino-access";
import {
  readResetToken,
  resetTokenIsCurrent,
  signResetToken,
  type CondominoTokenPayload,
} from "@/shared/application/auth/condomino-token";
import { hashPassword } from "@/shared/application/auth/password-hash";
import { matchPasswordCandidates } from "@/shared/application/auth/password-login";
import {
  clearThrottle,
  consumeAttempt,
  loginAccountKeys,
  loginThrottleRules,
  resetRequestThrottleRules,
} from "@/shared/infrastructure/db/auth-throttle";
import { findUserIdsByEmail, storedEmailMatching } from "@/shared/infrastructure/db/user-email-lookup";
import { getMinisitioCondominium } from "../infrastructure/condominium";
import { MINISITIO_MAIL_FROM, sendMinisitioEmail } from "../infrastructure/mailer";
import type { MinisitioSessionInfo, MinisitioUserType, UserIndicators } from "../domain/types";

type AuthFailure = { ok: false; message: string };

/** Lo que se firma en la cookie de sesión del condómino (ver signCondominoToken). */
export interface CondominoSessionInput {
  userId: string;
  condominiumId: string;
  passwordHash: string | null;
}

const INVALID_CREDENTIALS =
  "Correo o contraseña incorrectos. Si es tu primera vez, usa “¿Olvidaste tu contraseña?” para activar tu cuenta.";
const TOO_MANY_ATTEMPTS = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";

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
  ip: string,
): Promise<{ ok: true; session: CondominoSessionInput; info: MinisitioSessionInfo } | AuthFailure> {
  const condo = await getMinisitioCondominium();
  if (!condo) return { ok: false, message: "Servicio no disponible." };

  const email = (emailInput || "").trim();
  const password = (passwordInput || "").trim();
  if (!email || !password) return { ok: false, message: "Ingresa tu correo y contraseña." };

  // El intento se cuenta antes de verificar (ver auth-throttle.ts).
  const throttle = loginThrottleRules(email, ip);
  if (!(await consumeAttempt(throttle))) return { ok: false, message: TOO_MANY_ATTEMPTS };

  const ids = await findUserIdsByEmail(email);
  const candidates = await prisma.user.findMany({
    where: { condominiumId: condo.id, id: { in: ids } },
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

  const verified = await matchPasswordCandidates(candidates, password);
  if (verified.length === 0) return { ok: false, message: INVALID_CREDENTIALS };

  // La contraseña ya se comprobó: desde aquí los mensajes pueden ser específicos.
  const matched = verified.filter((u) => u.isActive);
  if (matched.length === 0) return { ok: false, message: "Tu cuenta está inactiva. Contacta al administrador." };
  await clearThrottle(loginAccountKeys(throttle));

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

  // Auto-sanación: acceso legítimo sin la fila en UserRole → se vincula "Solo Minisitio" (nunca
  // el filtro amplio, que incluye Master).
  if (user.userRoles.length === 0) {
    try {
      const minisitioRole = await prisma.role.findFirst({
        where: minisitioOnlyRoleWhere(condo.id),
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

  return { ok: true, session: { userId: user.id, condominiumId: condo.id, passwordHash: user.passwordHash }, info };
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
): Promise<{ ok: true; session: CondominoSessionInput; info: MinisitioSessionInfo } | AuthFailure> {
  const condo = await getMinisitioCondominium();
  if (!condo) return { ok: false, message: "Condominio no encontrado." };

  const id = (userId || "").trim();
  if (!id) return { ok: false, message: "Falta el identificador del usuario." };

  const info = await getSessionInfo({ userId: id, condominiumId: condo.id, sv: "", exp: 0 });
  if (!info) return { ok: false, message: "Usuario no encontrado o inactivo." };
  // La sesión suplantada lleva la huella de la contraseña del usuario, como la suya propia.
  const user = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
  return { ok: true, session: { userId: id, condominiumId: condo.id, passwordHash: user?.passwordHash ?? null }, info };
}

// ---- Recuperación de contraseña ----

export const FORGOT_PASSWORD_GENERIC_MESSAGE =
  "Se ha enviado un enlace a tu correo electrónico para cambiar tu contraseña. Revisa tu bandeja de entrada y sigue las instrucciones.";

const INVALID_RESET_LINK = "El enlace es inválido, expiró o ya se usó. Solicita uno nuevo.";

/**
 * Si existe un usuario activo con ese correo exacto y con el rol del minisitio, le envía el
 * enlace de restablecimiento (1 h, un solo uso) a la dirección guardada que coincidió, no a la
 * tecleada. Nunca revela si el correo existe. Las solicitudes se limitan por correo e IP: al
 * llegar al límite no se envía nada, pero se responde igual.
 */
export async function requestPasswordReset(emailInput: string, origin: string, ip: string): Promise<void> {
  const email = (emailInput || "").trim();
  if (!email) return;

  if (!(await consumeAttempt(resetRequestThrottleRules(email, ip)))) return;

  const condominium = await getMinisitioCondominium();
  if (!condominium) return;

  const ids = await findUserIdsByEmail(email);
  if (ids.length === 0) return;
  const user = await prisma.user.findFirst({
    where: {
      id: { in: ids },
      condominiumId: condominium.id,
      isActive: true,
      userRoles: { some: { role: minisitioRoleWhere(condominium.id) } },
    },
    select: { id: true, email: true, personalEmail: true, businessEmail: true, passwordHash: true },
  });
  const to = user && storedEmailMatching(user, email);
  if (!user || !to) return;

  const loginEmail = user.email || user.personalEmail || user.businessEmail || to;
  const token = await signResetToken({ userId: user.id, email: loginEmail, passwordHash: user.passwordHash });
  const resetLink = `${origin}/minisitio/reset-password?token=${encodeURIComponent(token)}`;

  // Después de responder: si el envío corriera aquí, el tiempo de respuesta delataría qué correos
  // existen. Un error no se le muestra al usuario; igual recibe el mensaje genérico.
  after(async () => {
    try {
      await sendMinisitioEmail({
        from: MINISITIO_MAIL_FROM,
        to: [to],
        subject: "Restablecer tu contraseña - Val'Quirico",
        html: resetEmailHtml(resetLink),
      });
    } catch (error) {
      console.error("[minisitio] Error enviando email de reset:", error);
    }
  });
}

export async function validateResetToken(token: string): Promise<{ valid: true; email: string } | { valid: false; message: string }> {
  const payload = await readResetToken(token);
  if (!payload) return { valid: false, message: INVALID_RESET_LINK };
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { passwordHash: true } });
  if (!user || !(await resetTokenIsCurrent(payload, user.passwordHash))) return { valid: false, message: INVALID_RESET_LINK };
  return { valid: true, email: payload.email };
}

export async function resetPassword(token: string, newPasswordInput: string): Promise<{ ok: true; message: string } | AuthFailure> {
  const payload = await readResetToken(token);
  if (!payload) return { ok: false, message: INVALID_RESET_LINK };

  const newPassword = (newPasswordInput || "").trim();
  if (newPassword.length < 8) return { ok: false, message: "La contraseña debe tener al menos 8 caracteres" };

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, passwordHash: true } });
  if (!user) return { ok: false, message: "Usuario no encontrado" };
  if (!(await resetTokenIsCurrent(payload, user.passwordHash))) return { ok: false, message: INVALID_RESET_LINK };

  // scrypt usa sal nueva: el hash cambia aunque la contraseña sea la misma, así que el enlace
  // (y toda sesión abierta) deja de valer. Condicionado a la contraseña leída: si otro uso del
  // mismo enlace ganó la carrera, no se aplica.
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, passwordHash: user.passwordHash },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  if (count === 0) return { ok: false, message: INVALID_RESET_LINK };
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
