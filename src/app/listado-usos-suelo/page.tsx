import type { Metadata } from "next";
import { getLandUseListingUseCase } from "@/modules/land-uses";
import { toLandUseListingVM } from "@/modules/land-uses/presentation/land-use-listing.vm";
import { LandUseWorkbench } from "./components/land-use-workbench";

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
      <div className="flex flex-col gap-0">
        <h1 className="text-lg font-black text-brand tracking-tighter uppercase">Configuración de Usos de Suelo</h1>
        <p className="text-ink-soft/50 text-[11px] font-bold">
          {vm.condominiumName} · Gestión operativa de categorías y fórmulas de cálculo.
        </p>
      </div>

      <LandUseWorkbench initialVm={vm} />
    </div>
  );
}
