import type { Metadata } from "next";
import { getRegulationDirectoryUseCase } from "@/modules/regulations";
import { toRegulationDirectoryVM } from "@/modules/regulations/presentation/regulation-directory.vm";
import { ReglamentosWorkbench } from "./reglamentos-workbench";

export const metadata: Metadata = {
  title: "Reglamentos | Insulae 2.0",
  description: "Repositorio de reglamentos y documentos internos del condominio.",
};

export const dynamic = "force-dynamic";

export default async function ReglamentosPage() {
  const directory = await getRegulationDirectoryUseCase.execute();
  const vm = directory ? toRegulationDirectoryVM(directory) : null;

  if (!vm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin proyecto activo</h2>
        <p className="text-sm">No se encontró un condominio/proyecto activo para desplegar reglamentos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-0">
        <h1 className="text-lg font-black text-brand tracking-tighter uppercase">Reglamentos y Documentos</h1>
        <p className="text-ink-soft/50 text-[11px] font-bold">
          {vm.projectName} · Repositorio institucional de normativa y archivos internos.
        </p>
      </div>

      <ReglamentosWorkbench directory={vm} />
    </div>
  );
}
