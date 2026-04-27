import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getMiscIncomeCatalogUseCase } from "@/modules/misc-income";
import { MiscIncomeForm } from "./components/misc-income-form";

export default async function MiscIncomeCatalogPage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true }
  });

  if (!condominium) {
    return (
      <div className="p-20 text-center text-[#6d422a] font-[ui-serif] text-xl">
        No se encontró un condominio activo configurado.
      </div>
    );
  }

  const [concepts, chargeGroups] = await Promise.all([
    getMiscIncomeCatalogUseCase.execute(condominium.id),
    prisma.chargeGroup.findMany({
      where: { condominiumId: condominium.id, isActive: true }
    })
  ]);

  const ordinaryGroup = chargeGroups.find(g => g.kind === "ORDINARY");
  const extraordinaryGroup = chargeGroups.find(g => g.kind === "EXTRA_CONDO");

  if (!ordinaryGroup || !extraordinaryGroup) {
    return (
      <div className="p-20 text-center text-[#6d422a] font-[ui-serif] text-xl">
        Error: No se encontraron los grupos de cobro base (Ordinaria/Extraordinaria).
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcf9f5]">
      <MiscIncomeForm 
        initialConcepts={concepts} 
        ordinaryGroupId={ordinaryGroup.id}
        extraordinaryGroupId={extraordinaryGroup.id}
      />
    </main>
  );
}
