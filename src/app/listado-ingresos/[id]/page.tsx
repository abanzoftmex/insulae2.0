import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getIncomeUseCase } from "@/modules/income";
import { IncomeEditPage } from "./income-edit-page";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIncomePage({ params }: PageProps) {
  const { id } = await params;

  const income = await getIncomeUseCase.execute(id);
  if (!income) notFound();

  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  if (!condominium) {
    return <div className="p-20 text-center text-[#6d422a]">No hay condominio activo.</div>;
  }

  const [catalogs, chargeGroups, areas] = await Promise.all([
    prisma.miscIncomeCatalog.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.chargeGroup.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.privateArea.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#fcf9f5]">
      <IncomeEditPage
        income={income}
        catalogs={catalogs}
        chargeGroups={chargeGroups}
        areas={areas}
        condominiumSlug={condominium.slug}
        projectId={condominium.id}
      />
    </main>
  );
}
