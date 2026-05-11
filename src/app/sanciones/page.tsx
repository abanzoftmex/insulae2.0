import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PrismaSanctionRepository } from "@/modules/sanction/infrastructure/prisma-sanction.repository";
import { GetSanctionsUseCase } from "@/modules/sanction/application/sanction.use-cases";
import { SanctionWorkbench } from "./components/sanction-workbench";
import { PageBackBadge } from "@/components/ui/page-back-badge";

export const metadata: Metadata = {
  title: "Sanciones | Insulae 2.0",
  description: "Catálogo de sanciones y fundamentos legales del condominio.",
};

export const dynamic = "force-dynamic";

export default async function SanctionsPage() {
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

  const repository = new PrismaSanctionRepository(prisma);
  const useCase = new GetSanctionsUseCase(repository);
  const sanctions = await useCase.execute(condominium.id);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Catálogo de Sanciones</h1>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {condominium.name} · Administración de fundamentos legales y reglamentarios.
            </p>
          </div>
        </div>
      </div>

      <SanctionWorkbench initialSanctions={sanctions} />
    </div>
  );
}
