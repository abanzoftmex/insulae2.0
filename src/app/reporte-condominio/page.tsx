import type { Metadata } from "next";
import Link from "next/link";
import { getCondominiumReportUseCase } from "@/modules/condominium-report";
import { toCondominiumReportVM } from "@/modules/condominium-report/presentation/condominium-report.vm";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageBackBadge } from "@/components/ui/page-back-badge";
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Estadística del Condominio</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Dashboard Operativo</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {vm.projectName} · {vm.condominiumName} · Última edición {vm.updatedAtLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25">
            <Link href="/condominio"><ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden /> Configuración</Link>
          </Button>
        </div>
      </div>

      {/* Soles / Sombras Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden border-transparent shadow-layered">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Distribución Soles / Sombras</CardTitle>
            <span className="text-[10px] font-bold text-white/70">Base: {vm.classificationBaseLabel}</span>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[linear-gradient(135deg,#fff8e1_0%,#fff1b8_100%)] border border-yellow-200/50 flex flex-col justify-between min-h-25">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-bold uppercase text-yellow-700 tracking-widest">Soles</span>
                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-yellow-900/80">
                    <Sun className="h-3.5 w-3.5 text-yellow-200" />
                  </span>
                </div>
                <div>
                  <p className="text-4xl font-bold text-yellow-900 leading-none">{vm.availableAreas}</p>
                  <p className="text-[10px] font-bold text-yellow-800/60 uppercase mt-1.5">{vm.availableRatio} del total</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[linear-gradient(135deg,#e3f2fd_0%,#bbdefb_100%)] border border-blue-200/50 flex flex-col justify-between min-h-25">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-bold uppercase text-blue-700 tracking-widest">Sombras</span>
                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-900/80">
                    <Moon className="h-3.5 w-3.5 text-blue-200" />
                  </span>
                </div>
                <div>
                  <p className="text-4xl font-bold text-blue-900 leading-none">{vm.builtAreas}</p>
                  <p className="text-[10px] font-bold text-blue-800/60 uppercase mt-1.5">{vm.builtRatio} del total</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="h-2 w-full bg-canvas rounded-full overflow-hidden flex">
                <div className="h-full bg-yellow-400" style={{ width: `${vm.availableRatioValue}%` }} />
                <div className="h-full bg-blue-400" style={{ width: `${vm.builtRatioValue}%` }} />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase text-ink-soft/70">
                <span>Total Base: {vm.classificationBaseTotal}</span>
                <span>{vm.classificationModeLabel}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          <StatCard accent="cyan" label="APoLes (Padres)" value={vm.activeParents} trend={{ value: `Inactivas: ${vm.builtAreas}`, isUp: true }} icon={<Activity className="h-3.5 w-3.5" />} />
          <StatCard accent="lime" label="FAPs (Hijos)" value={vm.activeChildren} icon={<Layers className="h-3.5 w-3.5" />} />
        </div>
      </div>

      {/* Technical Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-layered border-transparent">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Datos Técnicos Generales</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sección 1: Totales de Proyecto */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-brand tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand" /> Totales de Proyecto
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Áreas privativas / lotes totales</span>
                    <span className="font-bold text-ink">{vm.projectTotalApoles}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">M2 de áreas privativas totales</span>
                    <span className="font-bold text-ink">{vm.projectTotalM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">M2 de áreas comunes</span>
                    <span className="font-bold text-ink">{vm.projectCommonAreasM2} m²</span>
                  </div>
                </div>
              </div>

              {/* Sección 2: Operativos Reales (Padres) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-cyan-600 tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" /> Lotes Reales Operativos
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Áreas privativas / lotes</span>
                    <span className="font-bold text-ink">{vm.parentAreasCount}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">M2 de áreas privativas / lotes</span>
                    <span className="font-bold text-ink">{vm.parentAreasM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">M2 de áreas comunes (lotes)</span>
                    <span className="font-bold text-ink">{vm.parentAreasCommonM2} m²</span>
                  </div>
                </div>
              </div>

              {/* Sección 3: Clasificación Operativa */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-yellow-600 tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" /> Clasificación Operativa
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Lotes disponibles (Soles)</span>
                    <span className="font-bold text-yellow-700">{vm.availableAreas}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Lotes construidos (Sombras)</span>
                    <span className="font-bold text-blue-700">{vm.builtAreas}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">Porcentajes del condominio</span>
                    <span className="font-extrabold text-[10px] text-ink-soft">{vm.availableRatio} soles / {vm.builtRatio} sombras</span>
                  </div>
                </div>
              </div>

              {/* Sección 4: Estructura & Sub-divisiones */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-lime-600 tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-lime-500" /> Estructura y Fusiones
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Fracciones de áreas privativas</span>
                    <span className="font-bold text-ink">{vm.activeChildren}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Fusiones de Áreas / lotes</span>
                    <span className="font-bold text-ink">{vm.activeFusionsCount}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">Fracción indiviso total</span>
                    <span className="font-bold text-ink">{vm.totalIndiviso}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-layered border-transparent flex flex-col justify-between">
          <div>
            <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Notas de Compatibilidad</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 overflow-y-auto no-scrollbar max-h-75">
              {vm.caveats.map((note, idx) => (
                <div key={idx} className="flex gap-2 p-2.5 rounded bg-brand-deep/2 border border-line/50">
                  <Info className="h-4 w-4 text-brand-accent shrink-0 mt-0.5" />
                  <p className="text-[11px] font-semibold text-ink-soft/80 leading-relaxed italic">{note}</p>
                </div>
              ))}
            </CardContent>
          </div>
          <div className="p-4 border-t border-line/30 bg-canvas/30 text-[10px] text-ink-soft font-medium uppercase tracking-wider text-center rounded-b-card">
            Última edición: <strong>{vm.updatedAtLabel}</strong>
          </div>
        </Card>
      </div>

      {/* Usage Matrix */}
      <Card className="overflow-hidden border-transparent shadow-layered">
        <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Totales por Usos de suelo</CardTitle>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest mt-2 bg-white text-brand border-0">Total: {vm.grandTotal}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto no-scrollbar max-h-125">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-9 bg-canvas/30 text-[9px] font-bold uppercase tracking-widest text-ink-soft/80 border-b border-line">
                  <th className="sticky top-0 z-20 px-4 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 min-w-70">Descripción del Uso</th>
                  <th className="sticky top-0 z-20 px-4 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 min-w-35 text-center">Sigla</th>
                  <th className="sticky top-0 z-20 px-4 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 w-25 text-right">Total</th>
                  {vm.zones.map(z => (
                    <th key={z} className="sticky top-0 z-20 px-4 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 min-w-30 text-right">{z}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {vm.rows.map((row, index) => (
                  <tr key={row.landUseName} className={cn("hover:bg-brand-mint/20 transition-colors", index % 2 === 0 ? "bg-white" : "bg-canvas/60")}>
                    <td className="px-4 py-2 text-sm font-bold text-ink border-r border-black/8">{row.landUseName}</td>
                    <td className="px-4 py-2 text-center border-r border-black/8"><Badge variant="brand" className="px-2.5 py-1 rounded-md text-[9px] font-bold tracking-widest">{row.landUseInitials}</Badge></td>
                    <td className="px-4 py-2 text-right font-bold text-brand border-r border-black/8 text-sm">{row.total}</td>
                    {row.byZone.map((count, idx) => (
                      <td key={idx} className="px-4 py-2 text-right text-xs font-medium text-ink-soft border-r border-black/8">{count}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="h-10 sticky bottom-0 z-10 bg-brand-deep text-white font-bold uppercase text-xs">
                  <td colSpan={2} className="px-4 py-2 text-right border-r border-white/10">Total General</td>
                  <td className="px-4 py-2 text-right border-r border-white/10 text-sm">{vm.grandTotal}</td>
                  {vm.totalsByZone.map((t, idx) => (
                    <td key={idx} className="px-4 py-2 text-right border-r border-white/10 text-xs">{t}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-3 bg-canvas border border-line rounded-md">
        <Database className="h-3.5 w-3.5 text-brand/40" />
        <p className="text-[10px] font-bold text-ink-soft/70 uppercase tracking-widest">
          Sincronización Neon Directa · Motor de Cálculo v2.0
        </p>
      </div>
    </div>
  );
}
