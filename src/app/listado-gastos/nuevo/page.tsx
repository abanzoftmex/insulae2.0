import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { ExpenseCreatePage } from "./expense-create-page";

export default async function NewExpensePage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  if (!condominium) {
    return <div className="p-20 text-center text-[#6d422a]">No hay condominio activo.</div>;
  }

  const budgetConcepts = await prisma.budgetExpenseConcept.findMany({
    where: { condominiumId: condominium.id, isActive: true },
    orderBy: [{ budgetGroup: "asc" }, { name: "asc" }],
    select: { id: true, name: true, budgetGroup: true },
  });

  return (
    <main className="min-h-screen bg-[#fcf9f5]">
      <ExpenseCreatePage
        budgetConcepts={budgetConcepts}
        condominiumSlug={condominium.slug}
        projectId={condominium.id}
      />
    </main>
  );
}
