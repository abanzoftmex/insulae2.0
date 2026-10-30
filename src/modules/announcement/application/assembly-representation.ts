import { prisma } from "@/shared/infrastructure/db/prisma";

export interface RepresentedKey {
  key: string;
  name: string;
  type: "POSITION" | "GUEST";
}

/**
 * A quién representa una cuenta en una convocatoria: sus puestos activos que están invitados y
 * los invitados especiales activos con alguno de sus correos guardados (los de hoy, no el de la
 * cookie de sesión; exacto salvo mayúsculas: `equals` con `mode: "insensitive"` sería ILIKE y
 * `_`/`%` harían de comodines). Lo usan la pantalla de participación y las acciones de voto y
 * asistencia para validar la clave en el servidor.
 */
export async function getRepresentedKeys(announcementId: string, session: { userId: string }): Promise<RepresentedKey[]> {
  const [user, invited, assignments, guests] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { email: true, personalEmail: true, businessEmail: true } }),
    prisma.announcementInvitedPosition.findMany({ where: { announcementId, isActive: true }, select: { positionId: true } }),
    prisma.condominiumStructurePositionAssignment.findMany({
      where: { userId: session.userId, isActive: true },
      include: { position: true },
    }),
    prisma.specialGuest.findMany({ where: { announcementId, isActive: true } }),
  ]);
  const userEmails = new Set(
    [user?.email, user?.personalEmail, user?.businessEmail]
      .map((email) => email?.trim().toLowerCase())
      .filter((email): email is string => !!email),
  );

  const invitedIds = new Set(invited.map((ip) => ip.positionId));
  const keys: RepresentedKey[] = [];
  for (const assignment of assignments) {
    if (assignment.position && invitedIds.has(assignment.positionId)) {
      keys.push({ key: assignment.positionId, name: assignment.position.name, type: "POSITION" });
    }
  }
  for (const guest of guests) {
    const guestEmail = guest.email?.trim().toLowerCase();
    if (guestEmail && userEmails.has(guestEmail)) {
      keys.push({ key: guest.id, name: guest.name, type: "GUEST" });
    }
  }
  return keys;
}

/** Claves que existen en la convocatoria: puestos invitados activos e invitados especiales activos. */
export async function getAnnouncementKeys(announcementId: string): Promise<Set<string>> {
  const [invited, guests] = await Promise.all([
    prisma.announcementInvitedPosition.findMany({ where: { announcementId, isActive: true }, select: { positionId: true } }),
    prisma.specialGuest.findMany({ where: { announcementId, isActive: true }, select: { id: true } }),
  ]);
  return new Set([...invited.map((ip) => ip.positionId), ...guests.map((g) => g.id)]);
}
