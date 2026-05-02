import type { Metadata } from "next";
import { getTicketListingUseCase, toTicketListingVM } from "@/modules/tickets";
import { TicketsWorkbench } from "./tickets-workbench";

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
      <div className="flex flex-col gap-0">
        <h1 className="text-lg font-black text-brand tracking-tighter uppercase">Tickets de Soporte</h1>
        <p className="text-ink-soft/50 text-[11px] font-bold">
          Mesa de atención y seguimiento a solicitudes de residentes.
        </p>
      </div>

      <TicketsWorkbench initialRows={vm.rows} condominiumSlug={vm.condominiumSlug} />
    </div>
  );
}
