import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getBudgetStructureUseCase } from "@/modules/budget";
import { EditBudgetGroupForm } from "./edit-form";
import { PrismaBudgetRepository } from "@/modules/budget/infrastructure/prisma-budget.repository";

const budgetRepo = new PrismaBudgetRepository();

export default async function EditBudgetGroupPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ anio?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const id = params.id;
  const currentYear = new Date().getFullYear();
  const year = parseInt(searchParams.anio ?? "", 10) || currentYear;

  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return <div>No hay condominio activo</div>;

  let initialData: any;

  if (id === "nuevo") {
    initialData = {
      name: "",
      year: year,
      condominiumId: condo.id,
      category: "ADMINISTRATION",
      concepts: []
    };
  } else {
    initialData = await budgetRepo.getBudgetGroupById(id);
    if (!initialData) return <div>Grupo no encontrado</div>;
  }

  const allGroups = await budgetRepo.getCondominiumBudgetGroups(condo.id, year);
  const chargeGroups = await prisma.chargeGroup.findMany({
    where: { condominiumId: condo.id, isActive: true },
    orderBy: { name: 'asc' }
  });

  return (
    <main className="min-h-screen bg-[#fcf9f5]">
      <EditBudgetGroupForm 
        initialData={initialData} 
        allGroups={allGroups.map(g => ({ id: g.id, name: g.name }))}
        chargeGroups={chargeGroups.map(cg => ({ id: cg.id, name: cg.name }))}
      />
    </main>
  );
}
