import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import type { Metadata } from "next";
import { getZoneListingUseCase } from "@/modules/zones";
import { toZoneListingVM } from "@/modules/zones/presentation/zone-listing.vm";
import { ZonesWorkbench } from "./zones-workbench";
import { PageBackBadge } from "@/components/ui/page-back-badge";

export const metadata: Metadata = {
  title: "Barrios | Insulae 2.0",
  description: "Listado de barrios (zonas) del condominio.",
};

export const dynamic = "force-dynamic";

import { getUserPermissions, hasPermission } from "@/shared/application/auth/permissions";
import { Badge } from "@/components/ui/badge";

export default async function ListadoZonasPage() {
  await requirePageAccess(MODULES.BARRIOS);

  const permissions = await getUserPermissions();
  const canCreate = hasPermission(permissions, MODULES.BARRIOS, "canCreate");
  const canUpdate = hasPermission(permissions, MODULES.BARRIOS, "canUpdate");
  const canDelete = hasPermission(permissions, MODULES.BARRIOS, "canDelete");

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Barrios y Zonas</h1>
              {!canUpdate && !canCreate && (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-bold tracking-widest bg-ink-soft/10 text-ink-soft border-line">
                  Modo Solo Lectura
                </Badge>
              )}
            </div>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {vm.condominiumName} · Gestión de áreas geográficas y subzonas.
            </p>
          </div>
        </div>
      </div>

      <ZonesWorkbench 
        initialRows={vm.rows} 
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
