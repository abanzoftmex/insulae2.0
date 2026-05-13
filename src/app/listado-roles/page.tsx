import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaRoleRepository } from "@/modules/role/infrastructure/prisma-role.repository";
import { GetRolesUseCase } from "@/modules/role/application/role.use-cases";
import { RoleList } from "./components/role-list";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roles | Insulae 2.0",
  description: "Gestión de roles y permisos de acceso del sistema.",
};

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
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Catálogo de Roles</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Control de Acceso</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condominium.name} · Roles y permisos de usuarios del sistema.
            </p>
          </div>
        </div>
      </div>
      <RoleList roles={roles} condominiumId={condominium.id} />
    </div>
  );
}
