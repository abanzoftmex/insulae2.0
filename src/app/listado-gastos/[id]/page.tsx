import React from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getExpenseUseCase } from "@/modules/expense";
import { ExpenseEditPage } from "./expense-edit-page";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExpensePage({ params }: PageProps) {
  const { id } = await params;

  const expense = await getExpenseUseCase.findById(id);
  if (!expense) notFound();

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
      <ExpenseEditPage
        expense={expense}
        budgetConcepts={budgetConcepts}
        condominiumSlug={condominium.slug}
        projectId={condominium.id}
      />
    </main>
  );
}
