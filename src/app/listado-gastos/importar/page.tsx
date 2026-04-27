export const dynamic = "force-dynamic";

import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { ExpenseImporter } from "./expense-importer";

export default async function ImportExpensesPage() {
  const condo = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const budgetConcepts = condo
    ? await prisma.budgetExpenseConcept.findMany({
        where: { condominiumId: condo.id, isActive: true },
        orderBy: [{ order: "asc" }, { budgetGroup: "asc" }, { name: "asc" }],
        select: { id: true, legacyBudgetConceptId: true, name: true, budgetGroup: true },
      })
    : [];

  return (
    <main className="min-h-screen bg-[#fcf9f5]">
      <ExpenseImporter budgetConcepts={budgetConcepts} />
    </main>
  );
}
