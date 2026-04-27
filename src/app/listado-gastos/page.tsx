import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getExpenseUseCase } from "@/modules/expense";
import { ExpenseList } from "./components/expense-list";

export default async function ListadoGastosPage() {
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

  const [expenses, budgetConcepts] = await Promise.all([
    getExpenseUseCase.findAll({ condominiumId: condominium.id }),
    prisma.budgetExpenseConcept.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      orderBy: [{ budgetGroup: "asc" }, { name: "asc" }],
      select: { id: true, name: true, budgetGroup: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#fcf9f5]">
      <ExpenseList
        initialExpenses={expenses}
        budgetConcepts={budgetConcepts}
        condominiumSlug={condominium.slug}
        projectId={condominium.id}
      />
    </main>
  );
}
