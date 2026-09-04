import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { notFound, redirect } from "next/navigation";
import { PrismaBudgetRepository } from "@/modules/budget/infrastructure/prisma-budget.repository";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { BudgetGroupForm } from "../../components/budget-group-form";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anio?: string }>;
}

export default async function BudgetGroupPage({ params, searchParams }: PageProps) {
  await requirePageAccess(MODULES.ESTRUCTURA_PRESUPUESTO);

  const { id } = await params;
  const { anio } = await searchParams;

  const repo = new PrismaBudgetRepository();

  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true }
  });

  if (!condominium) {
    throw new Error("No active condominium found.");
  }

  // Calculate current active year from query param or current calendar year
  const currentYear = new Date().getUTCFullYear();
  let year = parseInt(anio ?? "", 10) || currentYear;

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
