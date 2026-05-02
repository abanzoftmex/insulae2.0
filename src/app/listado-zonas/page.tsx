import type { Metadata } from "next";
import { getZoneListingUseCase } from "@/modules/zones";
import { toZoneListingVM } from "@/modules/zones/presentation/zone-listing.vm";
import { ZonesWorkbench } from "./zones-workbench";

export const metadata: Metadata = {
  title: "Barrios | Insulae 2.0",
  description: "Listado de barrios (zonas) del condominio.",
};

export const dynamic = "force-dynamic";

export default async function ListadoZonasPage() {
  const listing = await getZoneListingUseCase.execute();
  const vm = listing ? toZoneListingVM(listing) : null;

  if (!vm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para consultar los barrios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-0">
        <h1 className="text-lg font-black text-brand tracking-tighter uppercase">Barrios y Zonas</h1>
        <p className="text-ink-soft/50 text-[11px] font-bold">
          {vm.condominiumName} · Gestión de áreas geográficas y subzonas.
        </p>
      </div>

      <ZonesWorkbench initialRows={vm.rows} />
    </div>
  );
}
