import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getExpenseUseCase } from "@/modules/expense";
import { ExpenseWorkbench } from "./components/expense-workbench";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";

export const metadata: Metadata = {
  title: "Egresos | Insulae 2.0",
  description: "Control de gastos, mantenimiento y administración del condominio.",
};

export const dynamic = "force-dynamic";

export default async function ListadoGastosPage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true, name: true },
  });

  if (!condominium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio activo configurado.</p>
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
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Egresos</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Finanzas</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condominium.name} · Auditoría y control de flujo de salida.
            </p>
          </div>
        </div>
      </div>

      <ExpenseWorkbench
        initialExpenses={expenses}
        budgetConcepts={budgetConcepts}
        condominiumSlug={condominium.slug}
        projectId={condominium.id}
      />
    </div>
  );
}
