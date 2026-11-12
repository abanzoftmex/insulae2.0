import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaRoleRepository } from "@/modules/role/infrastructure/prisma-role.repository";
import { GetModulesUseCase } from "@/modules/role/application/role.use-cases";
import { pickSuggestedRoleColor } from "@/modules/role/domain/role-colors";
import { RoleForm } from "../components/role-form";

export default async function NewRolePage() {
  await requirePageAccess(MODULES.ROLES, "canCreate");

  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
  });

  if (!condominium) {
    return <div className="p-8">No se encontró el condominio activo.</div>;
  }

  const repository = new PrismaRoleRepository(prisma);
  const useCase = new GetModulesUseCase(repository);
  const [modules, existingRoles] = await Promise.all([
    useCase.execute(),
    prisma.role.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      select: { color: true },
    }),
  ]);

  const suggestedColor = pickSuggestedRoleColor(existingRoles.map((r) => r.color));

  return (
    <RoleForm
      modules={modules}
      condominiumId={condominium.id}
      suggestedColor={suggestedColor}
    />
  );
}
