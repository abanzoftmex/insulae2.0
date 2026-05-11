import type { Metadata } from "next";
import { getRegulationDirectoryUseCase } from "@/modules/regulations";
import { toRegulationDirectoryVM } from "@/modules/regulations/presentation/regulation-directory.vm";
import { ReglamentosWorkbench } from "./reglamentos-workbench";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Reglamentos y Documentos</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Repositorio Institucional</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {vm.projectName} · Repositorio institucional de normativa y archivos internos.
            </p>
          </div>
        </div>
      </div>

      <ReglamentosWorkbench directory={vm} />
    </div>
  );
}
