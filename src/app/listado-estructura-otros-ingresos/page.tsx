import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getMiscIncomeCatalogUseCase } from "@/modules/misc-income";
import { MiscIncomeWorkbench } from "./components/misc-income-workbench";

export const metadata: Metadata = {
  title: "Estructura Ingresos | Insulae 2.0",
  description: "Configuración del catálogo de conceptos para otros ingresos.",
};

export const dynamic = "force-dynamic";

export default async function MiscIncomeCatalogPage() {
  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  if (!condominium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio activo configurado.</p>
      </div>
    );
  }

  const [concepts, chargeGroups] = await Promise.all([
    getMiscIncomeCatalogUseCase.execute(condominium.id),
    prisma.chargeGroup.findMany({
      where: { condominiumId: condominium.id, isActive: true },
      select: { id: true, name: true, kind: true }
    })
  ]);

  const ordinaryGroup = chargeGroups.find(g => g.kind === "ORDINARY");
  const extraordinaryGroup = chargeGroups.find(g => g.kind === "EXTRA_CONDO");

  if (!ordinaryGroup || !extraordinaryGroup) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Error de Configuración</h2>
        <p className="text-sm text-center">No se encontraron los grupos de cobro base (Ordinaria/Extraordinaria).</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-0">
        <h1 className="text-lg font-black text-brand tracking-tighter uppercase">Estructura de Otros Ingresos</h1>
        <p className="text-ink-soft/50 text-[11px] font-bold">
          {condominium.name} · Definición de conceptos y categorías financieras.
        </p>
      </div>

      <MiscIncomeWorkbench 
        initialConcepts={concepts} 
        ordinaryGroup={{ id: ordinaryGroup.id, name: ordinaryGroup.name }}
        extraordinaryGroup={{ id: extraordinaryGroup.id, name: extraordinaryGroup.name }}
      />
    </div>
  );
}
