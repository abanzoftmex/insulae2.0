import { notFound, redirect } from "next/navigation";
import { PrismaBudgetRepository } from "@/modules/budget/infrastructure/prisma-budget.repository";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { BudgetGroupForm } from "../../components/budget-group-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BudgetGroupPage({ params }: PageProps) {
  const { id } = await params;

  const repo = new PrismaBudgetRepository();

  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true }
  });

  if (!condominium) {
    throw new Error("No active condominium found.");
  }

  // Calculate current active year
  const startYear = new Date().getFullYear();
  let currentYear = new Date().getFullYear();
  if (currentYear < startYear) currentYear = startYear;
  let year = currentYear + 1; // Assuming we manage the upcoming budget year

  let initialData = null;

  if (id !== "nuevo") {
    initialData = await repo.getBudgetGroupById(id);
    if (!initialData) {
      return notFound();
    }
    year = initialData.year;
  }

  const existingGroups = await repo.getCondominiumBudgetGroups(condominium.id, year);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8 pt-6 relative pb-20">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand">
            {id === "nuevo" ? "Nuevo Grupo Presupuestal" : "Configurar Grupo"}
          </h2>
          <p className="text-[13px] font-bold text-ink-soft/60 uppercase tracking-widest mt-1">
            Ejercicio {year}
          </p>
        </div>
      </div>

      <BudgetGroupForm 
        initialData={initialData} 
        year={year} 
        existingGroups={existingGroups} 
      />
    </div>
  );
}
