import { prisma } from "@/shared/infrastructure/db/prisma";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password-hash";

/**
 * Candidatos de un login (un correo puede estar en varias cuentas) cuya contraseña coincide.
 *
 * - Si alguno estaba en un formato heredado (SHA-256 sin sal o MD5), se guarda de nuevo con
 *   scrypt y se devuelve con el hash nuevo, para firmar la sesión con él.
 * - Siempre hace al menos una verificación scrypt, aunque ningún candidato tenga contraseña:
 *   así el tiempo de respuesta no revela qué correos existen.
 */
export async function matchPasswordCandidates<T extends { id: string; passwordHash: string | null }>(
  candidates: T[],
  password: string,
): Promise<T[]> {
  const withPassword = candidates.filter((candidate) => candidate.passwordHash);
  if (!withPassword.some((candidate) => candidate.passwordHash!.startsWith("scrypt$"))) {
    await burnPasswordCheck(password);
  }

  const matched: T[] = [];
  for (const candidate of withPassword) {
    const { ok, needsRehash } = await verifyPassword(password, candidate.passwordHash);
    if (!ok) continue;
    if (!needsRehash) {
      matched.push(candidate);
      continue;
    }
    const passwordHash = await hashPassword(password);
    // Condicionado al hash leído: si la contraseña cambió mientras tanto, este login no cuenta.
    const { count } = await prisma.user.updateMany({
      where: { id: candidate.id, passwordHash: candidate.passwordHash },
      data: { passwordHash },
    });
    if (count > 0) matched.push({ ...candidate, passwordHash });
  }
  return matched;
}
