/** Selector de usuarios del modo superadmin (antes GET /api/dev/users). */
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getMinisitioCondominium } from "../condominium";

export interface SuperadminUserOption {
  id_directorio: string;
  displayName: string;
  email: string | null;
  userType: string;
  isCondomino: boolean;
  hasPassword: boolean;
}

export async function listUsersForSuperadmin(search: string): Promise<SuperadminUserOption[]> {
  const condominium = await getMinisitioCondominium();
  if (!condominium) return [];

  const users = await prisma.user.findMany({
    where: { condominiumId: condominium.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      businessName: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      userType: true,
      passwordHash: true,
      assignments: { where: { isActive: true }, select: { id: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const q = (search || "").trim().toLowerCase();
  return users
    .map((u) => ({
      id_directorio: u.id,
      displayName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.businessName || "(sin nombre)",
      email: u.email || u.personalEmail || u.businessEmail || null,
      userType: u.userType,
      isCondomino: u.assignments.length > 0,
      hasPassword: !!u.passwordHash,
    }))
    .filter(
      (r) =>
        !q ||
        r.displayName.toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        r.id_directorio.toLowerCase().includes(q),
    );
}
