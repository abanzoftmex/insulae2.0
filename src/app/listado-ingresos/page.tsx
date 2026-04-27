import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { listIncomesUseCase } from "@/modules/income";
import { IncomeList } from "./components/income-list";

export default async function ListadoIngresosPage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  if (!condominium) {
    return (
      <div className="p-20 text-center text-[#6d422a] font-[ui-serif] text-xl">
        No se encontró un condominio activo configurado.
      </div>
    );
  }

  const [incomes, catalogs, chargeGroups, areas] = await Promise.all([
    listIncomesUseCase.execute({ condominiumId: condominium.id }),
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
      <IncomeList
        initialIncomes={incomes}
        catalogs={catalogs}
        chargeGroups={chargeGroups}
        areas={areas}
        condominiumSlug={condominium.slug}
        projectId={condominium.id}
      />
    </main>
  );
}
