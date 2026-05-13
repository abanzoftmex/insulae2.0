import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaRoleRepository } from "@/modules/role/infrastructure/prisma-role.repository";
import { GetModulesUseCase } from "@/modules/role/application/role.use-cases";
import { RoleForm } from "../components/role-form";

export default async function NewRolePage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
  });

  if (!condominium) {
    return <div className="p-8">No se encontró el condominio activo.</div>;
  }

  const repository = new PrismaRoleRepository(prisma);
  const useCase = new GetModulesUseCase(repository);
  const modules = await useCase.execute();

  return <RoleForm modules={modules} condominiumId={condominium.id} />;
}
