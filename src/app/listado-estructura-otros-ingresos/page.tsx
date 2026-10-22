import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getMiscIncomeCatalogUseCase } from "@/modules/misc-income";
import { MiscIncomeWorkbench } from "./components/misc-income-workbench";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";

import { getUserPermissions, hasPermission } from "@/shared/application/auth/permissions";

export const metadata: Metadata = {
  title: "Estructura Ingresos | Insulae 2.0",
  description: "Configuración del catálogo de conceptos para otros ingresos.",
};

export const dynamic = "force-dynamic";

export default async function MiscIncomeCatalogPage() {
  await requirePageAccess(MODULES.OTROS_INGRESOS);

  const permissions = await getUserPermissions();
  const canCreate = hasPermission(permissions, MODULES.OTROS_INGRESOS, "canCreate");
  const canUpdate = hasPermission(permissions, MODULES.OTROS_INGRESOS, "canUpdate");
  const canDelete = hasPermission(permissions, MODULES.OTROS_INGRESOS, "canDelete");

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Estructura de Ingresos</h1>
              {!canCreate && !canUpdate && (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-bold tracking-widest bg-ink-soft/10 text-ink-soft border-line">
                  Modo Solo Lectura
                </Badge>
              )}
            </div>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Catálogo Financiero</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condominium.name} · Definición de conceptos y categorías financieras.
            </p>
          </div>
        </div>
      </div>

      <MiscIncomeWorkbench
        initialConcepts={concepts}
        ordinaryGroup={{ id: ordinaryGroup.id, name: ordinaryGroup.name }}
        extraordinaryGroup={{ id: extraordinaryGroup.id, name: extraordinaryGroup.name }}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
