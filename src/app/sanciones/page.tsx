import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { SanctionList } from "./components/sanction-list";
import { PrismaSanctionRepository } from "@/modules/sanction/infrastructure/prisma-sanction.repository";
import { GetSanctionsUseCase } from "@/modules/sanction/application/sanction.use-cases";

export const dynamic = "force-dynamic";

export default async function SanctionsPage() {
  const condominium = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condominium) return <div className="p-8 text-[#6d422a]">No se encontró el condominio activo.</div>;

  const repository = new PrismaSanctionRepository(prisma);
  const useCase = new GetSanctionsUseCase(repository);
  const sanctions = await useCase.execute(condominium.id);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <SanctionList sanctions={sanctions} />
    </div>
  );
}
