import type { Metadata } from "next";
import { getTicketListingUseCase, toTicketListingVM } from "@/modules/tickets";
import { TicketsWorkbench } from "./tickets-workbench";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Tickets | Insulae 2.0",
  description: "Atención a solicitudes y reportes de residentes.",
};

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const listing = await getTicketListingUseCase.execute();

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para operar tickets.</p>
      </div>
    );
  }

  const vm = toTicketListingVM(listing);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Tickets de Soporte</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Mesa de Ayuda</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Mesa de atención y seguimiento a solicitudes de residentes.
            </p>
          </div>
        </div>
      </div>

      <TicketsWorkbench initialRows={vm.rows} condominiumSlug={vm.condominiumSlug} />
    </div>
  );
}
