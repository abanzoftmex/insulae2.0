import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { listIncomesUseCase } from "@/modules/income";
import { IncomeWorkbench } from "./components/income-workbench";

export const metadata: Metadata = {
  title: "Ingresos | Insulae 2.0",
  description: "Gestión de ingresos ordinarios y otros ingresos del condominio.",
};

export const dynamic = "force-dynamic";

export default async function ListadoIngresosPage() {
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
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-0">
        <h1 className="text-lg font-black text-brand tracking-tighter uppercase">Ingresos</h1>
        <p className="text-ink-soft/50 text-[11px] font-bold">
          {condominium.name} · Registro y conciliación de movimientos financieros.
        </p>
      </div>

      <IncomeWorkbench
        initialIncomes={incomes}
        catalogs={catalogs}
        chargeGroups={chargeGroups}
        areas={areas}
        condominiumSlug={condominium.slug}
        projectId={condominium.id}
      />
    </div>
  );
}
