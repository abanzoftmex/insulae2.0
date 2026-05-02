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

  return (
    <main className="min-h-screen bg-[#fcf9f5] pb-24">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <RoleForm modules={modules} condominiumId={condominium.id} />
      </div>
    </main>
  );
}
