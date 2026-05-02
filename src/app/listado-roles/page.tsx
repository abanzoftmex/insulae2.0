import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaRoleRepository } from "@/modules/role/infrastructure/prisma-role.repository";
import { GetRolesUseCase } from "@/modules/role/application/role.use-cases";
import { RoleList } from "./components/role-list";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
  });

  if (!condominium) {
    return <div className="p-8">No se encontró el condominio activo.</div>;
  }

  const repository = new PrismaRoleRepository(prisma);
  const useCase = new GetRolesUseCase(repository);
  const roles = await useCase.execute(condominium.id);

  return (
    <main className="min-h-screen bg-[#fcf9f5] pb-24">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2f221a]">Roles</h1>
          <p className="text-[#958172] mt-2">
            Gestiona los roles y permisos de acceso para los usuarios del sistema.
          </p>
        </div>

        <RoleList roles={roles} condominiumId={condominium.id} />
      </div>
    </main>
  );
}
