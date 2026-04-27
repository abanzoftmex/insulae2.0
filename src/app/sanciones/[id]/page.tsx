import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { SanctionForm } from "../components/sanction-form";
import { PrismaSanctionRepository } from "@/modules/sanction/infrastructure/prisma-sanction.repository";
import { GetSanctionUseCase } from "@/modules/sanction/application/sanction.use-cases";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: {
    id: string;
  };
}

export default async function EditSanctionPage({ params }: Props) {
  const condominium = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condominium) notFound();

  const repository = new PrismaSanctionRepository(prisma);
  const useCase = new GetSanctionUseCase(repository);
  const sanction = await useCase.execute(params.id, condominium.id);

  if (!sanction) {
    notFound();
  }

  return <SanctionForm initialData={sanction} />;
}
