import type { Metadata } from "next";
import Link from "next/link";
import { getCondominiumReportUseCase } from "@/modules/condominium-report";
import { toCondominiumReportVM } from "@/modules/condominium-report/presentation/condominium-report.vm";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { 
  Sun, 
  Moon, 
  Layers, 
  Info, 
  ArrowRight,
  Database,
  FileText,
  Activity
} from "lucide-react";

export const metadata: Metadata = {
  title: "Reporte Condominio | Insulae 2.0",
  description: "Métricas operativas, distribución de soles/sombras y resumen por uso de suelo.",
};

export const dynamic = "force-dynamic";

export default async function ReporteCondominioPage() {
  const report = await getCondominiumReportUseCase.execute();
  const vm = report ? toCondominiumReportVM(report) : null;

  if (!vm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró información suficiente para construir el reporte.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-brand tracking-tighter uppercase">Información del Condominio</h1>
            <Badge variant="brand">Dashboard Operativo</Badge>
          </div>
          <p className="text-ink-soft/50 text-[11px] font-bold uppercase tracking-tight">
            {vm.projectName} · {vm.condominiumName} · Corte {vm.generatedAtLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 px-4 text-[10px] font-black uppercase">
            <Link href="/condominio">Configuración <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
          </Button>
        </div>
      </div>

      {/* Soles / Sombras Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-line bg-card flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-brand">Distribución Soles / Sombras</CardTitle>
            <span className="text-[10px] font-bold text-ink-soft/50">Base: {vm.classificationBaseLabel}</span>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[linear-gradient(135deg,#fff8e1_0%,#fff1b8_100%)] border border-yellow-200/50 flex flex-col justify-between min-h-[100px]">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-yellow-700 tracking-widest">Soles</span>
                  <Sun className="h-4 w-4 text-yellow-600/50" />
                </div>
                <div>
                  <p className="text-4xl font-black text-yellow-900 leading-none">{vm.availableAreas}</p>
                  <p className="text-[10px] font-bold text-yellow-800/60 uppercase mt-1.5">{vm.availableRatio} del total</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[linear-gradient(135deg,#e3f2fd_0%,#bbdefb_100%)] border border-blue-200/50 flex flex-col justify-between min-h-[100px]">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase text-blue-700 tracking-widest">Sombras</span>
                  <Moon className="h-4 w-4 text-blue-600/50" />
                </div>
                <div>
                  <p className="text-4xl font-black text-blue-900 leading-none">{vm.builtAreas}</p>
                  <p className="text-[10px] font-bold text-blue-800/60 uppercase mt-1.5">{vm.builtRatio} del total</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
               <div className="h-2 w-full bg-canvas rounded-full overflow-hidden flex">
                  <div className="h-full bg-yellow-400" style={{ width: `${vm.availableRatioValue}%` }} />
                  <div className="h-full bg-blue-400" style={{ width: `${vm.builtRatioValue}%` }} />
               </div>
               <div className="flex justify-between text-[9px] font-black uppercase text-ink-soft/40">
                  <span>Total Base: {vm.classificationBaseTotal}</span>
                  <span>{vm.classificationModeLabel}</span>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          <StatCard label="Áreas Operativas" value={vm.activePrivateAreas} trend={{ value: `Inactivas: ${vm.inactivePrivateAreas}`, isUp: true }} icon={<Activity className="h-3.5 w-3.5" />} />
          <StatCard label="Clasificadas" value={vm.classifiedAreas} trend={{ value: `Total Base: ${vm.classificationBaseTotal}`, isUp: true }} icon={<Layers className="h-3.5 w-3.5" />} />
        </div>
      </div>

      {/* Technical Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-layered border-transparent">
          <CardHeader className="px-4 py-3 border-b border-line bg-canvas/30">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-brand">Datos Técnicos Generales</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Áreas registradas", value: vm.totalRegisteredPrivateAreas },
                { label: "Con uso de suelo", value: vm.areasWithUseType },
                { label: "Sin uso de suelo", value: vm.areasWithoutUseType },
                { label: "M2 privativos", value: vm.totalPrivateAreaM2 },
                { label: "M2 construcción", value: vm.totalBuiltAreaM2 },
                { label: "M2 áreas comunes", value: vm.projectCommonAreasM2 },
                { label: "Fracción indiviso", value: vm.totalIndiviso },
                { label: "Actualización", value: vm.updatedAtLabel },
              ].map((f) => (
                <div key={f.label} className="p-2 rounded bg-canvas/40 border border-line/30">
                  <p className="text-[9px] font-black uppercase text-ink-soft/40 tracking-tighter leading-none">{f.label}</p>
                  <p className="text-[12px] font-bold text-ink mt-1 truncate">{f.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-layered border-transparent">
          <CardHeader className="px-4 py-3 border-b border-line bg-canvas/30">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-brand">Notas de Compatibilidad</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {vm.caveats.map((note, idx) => (
              <div key={idx} className="flex gap-2 p-2.5 rounded bg-brand-deep/[0.02] border border-line/50">
                 <Info className="h-3.5 w-3.5 text-brand-accent shrink-0 mt-0.5" />
                 <p className="text-[11px] font-medium text-ink-soft/80 leading-relaxed italic">{note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Usage Matrix */}
      <Card className="overflow-hidden border-transparent shadow-layered">
        <CardHeader className="px-4 py-3 border-b border-line bg-brand-deep/[0.03] flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-brand">Matriz de Ocupación por Uso y Barrio</CardTitle>
          <Badge variant="brand" className="h-5 px-2">Total: {vm.grandTotal}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-9 bg-canvas/30 text-[9px] font-black uppercase tracking-widest text-ink-soft/60 border-b border-line">
                  <th className="sticky top-0 z-20 px-4 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 min-w-[200px]">Descripción del Uso</th>
                  <th className="sticky top-0 z-20 px-4 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 w-[100px] text-center">Sigla</th>
                  <th className="sticky top-0 z-20 px-4 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 w-[100px] text-right">Total</th>
                  {vm.zones.map(z => (
                    <th key={z} className="sticky top-0 z-20 px-4 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 min-w-[120px] text-right">{z}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/30">
                {vm.rows.map(row => (
                  <tr key={row.landUseName} className="h-10 hover:bg-canvas/5 transition-colors">
                    <td className="px-4 py-1.5 text-[12px] font-bold text-ink border-r border-line/30">{row.landUseName}</td>
                    <td className="px-4 py-1.5 text-center border-r border-line/30"><Badge variant="outline" className="h-4 px-1">{row.landUseInitials}</Badge></td>
                    <td className="px-4 py-1.5 text-right font-black text-brand border-r border-line/30 text-[12px]">{row.total}</td>
                    {row.byZone.map((count, idx) => (
                      <td key={idx} className="px-4 py-1.5 text-right text-[11px] font-medium text-ink-soft border-r border-line/30">{count}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                 <tr className="h-10 bg-brand-deep text-white font-black uppercase text-[10px]">
                    <td colSpan={2} className="px-4 py-2 text-right border-r border-white/10">Total General</td>
                    <td className="px-4 py-2 text-right border-r border-white/10 text-[12px]">{vm.grandTotal}</td>
                    {vm.totalsByZone.map((t, idx) => (
                      <td key={idx} className="px-4 py-2 text-right border-r border-white/10 text-[11px]">{t}</td>
                    ))}
                 </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-3 bg-canvas border border-line rounded-md">
         <Database className="h-3.5 w-3.5 text-brand/40" />
         <p className="text-[10px] font-bold text-ink-soft/40 uppercase tracking-widest">
           Sincronización Neon Directa · Motor de Cálculo v2.0
         </p>
      </div>
    </div>
  );
}
