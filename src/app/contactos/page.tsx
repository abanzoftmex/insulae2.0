import type { Metadata } from "next";
import { getContactDirectoryUseCase } from "@/modules/contacts";
import { toContactDirectoryVM } from "@/modules/contacts/presentation/contact-directory.vm";
import { ContactosWorkbench } from "./contactos-workbench";

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
      <div className="flex flex-col gap-0">
        <h1 className="text-lg font-black text-brand tracking-tighter uppercase">Contactos</h1>
        <p className="text-ink-soft/50 text-[11px] font-bold">
          Gestión de medios de contacto y enlaces institucionales.
        </p>
      </div>

      <ContactosWorkbench entries={vm.entries} types={vm.types} />
    </div>
  );
}
