/**
 * Utilidades para la resolución canónica de datos de contacto y configuración de correo
 * en Insulae 2.0.
 */

export interface UserEmailCandidate {
  email?: string | null;
  personalEmail?: string | null;
  businessEmail?: string | null;
}

export interface UserPhoneCandidate {
  phone?: string | null;
  personalPhone?: string | null;
  businessPhone?: string | null;
}

/**
 * Resuelve la dirección de correo electrónico efectiva de un usuario o expediente.
 * Busca en orden de prioridad: email -> personalEmail -> businessEmail,
 * validando que tenga formato de correo básico (incluya '@') y descartando identificadores legados (ID-...).
 */
export function resolveUserEffectiveEmail(
  user?: UserEmailCandidate | null
): string | null {
  if (!user) return null;

  const candidates = [user.email, user.personalEmail, user.businessEmail];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (
        trimmed.length > 0 &&
        trimmed.includes("@") &&
        !trimmed.startsWith("ID-") &&
        !trimmed.includes("#")
      ) {
        return trimmed;
      }
    }
  }

  return null;
}

/**
 * Resuelve el teléfono efectivo de un usuario o expediente.
 * Busca en orden de prioridad: phone -> personalPhone -> businessPhone.
 */
export function resolveUserEffectivePhone(
  user?: UserPhoneCandidate | null
): string | null {
  if (!user) return null;

  const candidates = [user.phone, user.personalPhone, user.businessPhone];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return null;
}
