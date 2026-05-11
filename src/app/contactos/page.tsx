import type { Metadata } from "next";
import { getContactDirectoryUseCase } from "@/modules/contacts";
import { toContactDirectoryVM } from "@/modules/contacts/presentation/contact-directory.vm";
import { ContactosWorkbench } from "./contactos-workbench";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Contactos | Insulae 2.0",
  description: "Gestión de medios de contacto institucionales del condominio.",
};

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const directory = await getContactDirectoryUseCase.execute();
  const vm = directory ? toContactDirectoryVM(directory) : null;

  if (!vm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para desplegar contactos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Contactos</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Directorio Institucional</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Gestión de medios de contacto y enlaces institucionales.
            </p>
          </div>
        </div>
      </div>

      <ContactosWorkbench entries={vm.entries} types={vm.types} />
    </div>
  );
}
