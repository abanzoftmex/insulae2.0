import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaRoleRepository } from "@/modules/role/infrastructure/prisma-role.repository";
import { GetRoleUseCase, GetModulesUseCase } from "@/modules/role/application/role.use-cases";
import { RoleForm } from "../components/role-form";
import { notFound } from "next/navigation";

interface Props {
  params: { id: string };
}

export default async function EditRolePage(props: Props) {
  const params = await props.params;
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
  });

  if (!condominium) {
    return <div className="p-8">No se encontró el condominio activo.</div>;
  }

  const repository = new PrismaRoleRepository(prisma);
  const roleUseCase = new GetRoleUseCase(repository);
  const moduleUseCase = new GetModulesUseCase(repository);

  const [role, modules] = await Promise.all([
    roleUseCase.execute(params.id, condominium.id),
    moduleUseCase.execute(),
  ]);

  if (!role) {
    notFound();
  }

  return <RoleForm initialData={role} modules={modules} condominiumId={condominium.id} />;
}
