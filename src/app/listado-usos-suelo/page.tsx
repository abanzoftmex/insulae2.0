import type { Metadata } from "next";
import { getLandUseListingUseCase } from "@/modules/land-uses";
import { toLandUseListingVM } from "@/modules/land-uses/presentation/land-use-listing.vm";
import { LandUseWorkbench } from "./components/land-use-workbench";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Usos de Suelo | Insulae 2.0",
  description: "Administración de tipos de uso de suelo y cargos asociados.",
};

export const dynamic = "force-dynamic";

export default async function ListadoUsosSueloPage() {
  const listing = await getLandUseListingUseCase.execute();
  const vm = listing ? toLandUseListingVM(listing) : null;

  if (!vm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para consultar los usos de suelo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Configuración de Usos de Suelo</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Configuración Operativa</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {vm.condominiumName} · Gestión operativa de categorías y fórmulas de cálculo.
            </p>
          </div>
        </div>
      </div>

      <LandUseWorkbench initialVm={vm} />
    </div>
  );
}
