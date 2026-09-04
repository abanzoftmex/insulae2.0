import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import type { Metadata } from "next";
import Link from "next/link";
import { getCondominiumReportUseCase } from "@/modules/condominium-report";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
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
  await requirePageAccess(MODULES.REPORTE_CONDOMINIO);

  const report = await getCondominiumReportUseCase.execute();
  const vm = report ? toCondominiumReportVM(report) : null;

  const dbCommonAreas = await prisma.privateArea.findMany({
    where: {
      condominium: { slug: PROJECT_SCOPE.condominiumCode },
      isActive: true,
      parentPrivateAreaId: null,
      name: {
        in: ["Halo Verde", "Áreas comunes zona de equipamiento", "Estacionamiento", "Áreas comunes Calles"]
      }
    },
    select: {
      name: true,
      m2CommonAreaChildren: true,
      childPrivateAreas: {
        where: { isActive: true },
        select: { id: true }
      }
    }
  });

  const findCA = (name: string) => {
    const found = dbCommonAreas.find(a => a.name === name);
    return {
      m2: found?.m2CommonAreaChildren ? found.m2CommonAreaChildren.toString() : "",
      count: found?.childPrivateAreas.length ?? 0
    };
  };

  const caDetails = {
    haloVerde: findCA("Halo Verde"),
    equipamiento: findCA("Áreas comunes zona de equipamiento"),
    estacionamiento: findCA("Estacionamiento"),
    calles: findCA("Áreas comunes Calles")
  };

  const childrenWithParents = await prisma.user.findMany({
    where: {
      condominium: { slug: PROJECT_SCOPE.condominiumCode },
      isActive: true,
      parentId: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      registrationTypeCode: true,
      registrationTypeDesc: true,
      idVq: true,
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          apolfap: true,
        }
      }
    },
    orderBy: {
      parent: {
        firstName: "asc"
      }
    }
  });

  interface OwnerGroup {
    parentId: string;
    parentName: string;
    parentApol: string;
    children: typeof childrenWithParents;
  }

  const groupsMap = new Map<string, OwnerGroup>();

  for (const child of childrenWithParents) {
    const parent = child.parent;
    if (!parent) continue;

    const parentId = parent.id;
    const parentName = `${parent.firstName ?? ""} ${parent.lastName ?? ""}`.trim() || "Sin nombre";
    const parentApol = parent.apolfap || "Sin APOL";

    if (!groupsMap.has(parentId)) {
      groupsMap.set(parentId, {
        parentId,
        parentName,
        parentApol,
        children: [],
      });
    }

    groupsMap.get(parentId)!.children.push(child);
  }

  const ownerGroups = Array.from(groupsMap.values());

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
                <div className="mt-3 pt-2.5 border-t border-yellow-800/10 flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-yellow-800/70 uppercase">APOLes Totales:</span>
                  <span className="font-extrabold text-yellow-900 bg-yellow-900/10 rounded px-1.5 py-0.5">{vm.apolCount}</span>
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
                <div className="mt-3 pt-2.5 border-t border-blue-800/10 flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-blue-800/70 uppercase">Fracciones de APOLes:</span>
                  <span className="font-extrabold text-blue-900 bg-blue-900/10 rounded px-1.5 py-0.5">{vm.activeChildrenOfApolAreas}</span>
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
          <StatCard
            accent="cyan"
            label="APoLes (Padres)"
            value={vm.activeParents}
            trend={{
              value: `Inactivas: ${vm.inactiveParents}`,
              isUp: Number(vm.inactiveParents) === 0
            }}
            icon={<Activity className="h-3.5 w-3.5" />}
          />
          <Card className="p-4 flex flex-col justify-between min-h-25 shadow-sm bg-lime-50/70 border-lime-200/60">
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-lime-700">
                FAPAs (Hijos)
              </p>
              <div className="p-1.5 rounded-md bg-lime-900 text-lime-200">
                <Layers className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-xl font-bold leading-none text-lime-700">
                {vm.activeChildrenOfApolAreas}
              </h3>
              <p className="text-[10px] font-bold text-lime-600/60 uppercase mt-1">Fracciones de APOLes</p>
            </div>
             <div className="mt-3 pt-2.5 border-t border-lime-600/10 flex justify-between items-center text-[10px]">
               <span className="font-semibold text-lime-600/70 uppercase">Fracciones hijos de áreas comunes (Calles):</span>
               <span className="font-extrabold text-lime-700 bg-lime-900/10 rounded px-1.5 py-0.5">{vm.activeChildrenOfCommonAreas}</span>
             </div>
          </Card>
        </div>
      </div>

      {/* Technical Data Grid */}
      <div className="w-full">
        <Card className="w-full shadow-layered border-transparent">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Datos Técnicos Generales</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sección 1: Totales de Proyecto */}
                <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-brand tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand" /> Total de m2 legales del condominio
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Áreas privativas / lotes totales</span>
                    <span className="font-bold text-ink">{vm.projectTotalApoles}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Superficie total
                      <span className="ml-1 text-[9px] text-brand/50 font-normal">(configurado en /condominio)</span>
                    </span>
                    <span className="font-bold text-ink">{vm.projectTotalM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">M2 de áreas privativas totales
                      <span className="ml-1 text-[9px] text-brand/50 font-normal">(configurado en /condominio)</span>
                    </span>
                    <span className="font-bold text-ink">{vm.projectPrivateAreasM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">M2 de áreas comunes
                      <span className="ml-1 text-[9px] text-brand/50 font-normal">(configurado en /condominio)</span>
                    </span>
                    <span className="font-bold text-ink">{vm.projectCommonAreasM2} m²</span>
                  </div>
                </div>
              </div>

              {/* Sección 2a: APOLes — Áreas Privativas */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-cyan-600 tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" /> APOLes — Áreas Privativas
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Áreas privativas (APOLes)</span>
                    <span className="font-bold text-cyan-700">{vm.apolCount}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">M2 de áreas privativas</span>
                    <span className="font-bold text-ink">{vm.apolAreasM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">Fracciones (hijos de APOLes)</span>
                    <span className="font-bold text-ink">{vm.activeChildrenOfApolAreas}</span>
                  </div>
                </div>
              </div>

              {/* Sección 2b: Áreas Comunes */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-teal-600 tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-500" /> Áreas Comunes
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Áreas comunes registradas</span>
                    <span className="font-bold text-teal-700">{vm.commonAreaParentCount}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">M2 áreas comunes condominio
                      <span className="ml-1 text-[9px] text-teal-600/50 font-normal">(configurado en /condominio)</span>
                    </span>
                    <span className="font-bold text-ink">{vm.projectCommonAreasM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">Fracciones (hijos de áreas comunes)</span>
                    <span className="font-bold text-ink">{vm.activeChildrenOfCommonAreas}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-line/25 space-y-1">
                    <div className="flex justify-between text-[11px] py-0.5 border-b border-line/20">
                      <span className="text-ink-soft/80 font-medium">Estacionamiento</span>
                      <span className="font-bold text-ink">{caDetails.estacionamiento.m2 ? `${parseFloat(caDetails.estacionamiento.m2).toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 6 })} m²` : "—"}</span>
                    </div>
                    <div className="flex justify-between text-[10px] pb-1 border-b border-line/10 pl-2">
                      <span className="text-ink-soft/60">— Fracciones Estacionamiento</span>
                      <span className="font-semibold text-ink-soft/80">{caDetails.estacionamiento.count}</span>
                    </div>
                    <div className="flex justify-between text-[11px] py-0.5 border-b border-line/20">
                      <span className="text-ink-soft/80 font-medium">Áreas comunes (Calles)</span>
                      <span className="font-bold text-ink">{caDetails.calles.m2 ? `${parseFloat(caDetails.calles.m2).toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 6 })} m²` : "—"}</span>
                    </div>
                    <div className="flex justify-between text-[10px] pb-1 border-b border-line/10 pl-2">
                      <span className="text-ink-soft/60">— Fracciones Calles</span>
                      <span className="font-semibold text-ink-soft/80">{caDetails.calles.count}</span>
                    </div>
                    <div className="flex justify-between text-[11px] py-0.5 border-b border-line/20">
                      <span className="text-ink-soft/80 font-medium">Halo Verde</span>
                      <span className="font-bold text-ink">{caDetails.haloVerde.m2 ? `${parseFloat(caDetails.haloVerde.m2).toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 6 })} m²` : "—"}</span>
                    </div>
                    <div className="flex justify-between text-[10px] pb-1 border-b border-line/10 pl-2">
                      <span className="text-ink-soft/60">— Fracciones Halo Verde</span>
                      <span className="font-semibold text-ink-soft/80">{caDetails.haloVerde.count}</span>
                    </div>
                    <div className="flex justify-between text-[11px] py-0.5 border-b border-line/20">
                      <span className="text-ink-soft/80 font-medium">Zona de Equipamiento</span>
                      <span className="font-bold text-ink">{caDetails.equipamiento.m2 ? `${parseFloat(caDetails.equipamiento.m2).toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 6 })} m²` : "—"}</span>
                    </div>
                    <div className="flex justify-between text-[10px] pl-2">
                      <span className="text-ink-soft/60">— Fracciones Equipamiento</span>
                      <span className="font-semibold text-ink-soft/80">{caDetails.equipamiento.count}</span>
                    </div>
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
                    <span className="text-ink-soft font-medium">Fracciones de APOLes</span>
                    <span className="font-bold text-cyan-700">{vm.activeChildrenOfApolAreas}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Fracciones de Áreas Comunes</span>
                    <span className="font-bold text-teal-700">{vm.activeChildrenOfCommonAreas}</span>
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

              {/* Sección 5: Coeficiente de uso de suelo (CUS) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-amber-600 tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Coeficiente de uso de suelo (CUS)
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">CUS</span>
                    <span className="font-bold text-ink">{vm.cus}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">CUS Permitido</span>
                    <span className="font-bold text-ink">{vm.cusPermitido}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Total de Construcción</span>
                    <span className="font-bold text-ink">{vm.totalConstruccion !== "Sin definir" ? `${vm.totalConstruccion} m²` : "Sin definir"}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">Barrios</span>
                    <span className="font-bold text-ink">{vm.barrios}</span>
                  </div>
                </div>
              </div>

              {/* Sección 6: Coeficiente de utilización de suelo (COS) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-purple-600 tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" /> Coeficiente de utilización de suelo (COS)
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">COS Área Privativa</span>
                    <span className="font-bold text-ink">{vm.cosPrivativo}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">COS Área Común</span>
                    <span className="font-bold text-ink">{vm.cosComun}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Users by Owner Table */}
      <Card className="overflow-hidden border-transparent shadow-layered">
        <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
            Usuarios Vinculados por Propietario
          </CardTitle>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest bg-white text-brand border-0">
            Total en Sistema: {childrenWithParents.length}
          </Badge>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas/30 text-[9px] font-bold uppercase tracking-widest text-ink-soft/80 border-b border-line">
                  <th className="px-4 py-3">Propietario / Dueño</th>
                  <th className="px-4 py-3">Unidad / ApolFap</th>
                  <th className="px-4 py-3">Usuarios Vinculados (Detalle)</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {ownerGroups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink-soft/50 italic text-[11px] font-bold uppercase tracking-tight">
                      Sin usuarios vinculados registrados en el sistema.
                    </td>
                  </tr>
                ) : (
                  ownerGroups.map((group, idx) => (
                    <tr key={group.parentId} className={cn("hover:bg-brand-mint/10 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-canvas/40")}>
                      <td className="px-4 py-3.5 align-top">
                        <p className="text-sm font-bold text-ink leading-tight">{group.parentName}</p>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className="text-xs font-mono font-bold text-brand-deep">{group.parentApol}</span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col gap-2">
                          {group.children.map((c) => (
                            <div key={c.id} className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                              <span className="font-semibold text-ink">
                                {`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "-"}
                              </span>
                              <Badge variant="brand" className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest bg-canvas text-ink-soft border border-line">
                                {c.registrationTypeDesc || c.registrationTypeCode}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-right">
                        <span className="text-sm font-black text-brand">{group.children.length}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage Matrix */}
      <Card className="overflow-hidden border-transparent shadow-layered">
        <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Totales por Usos de suelo</CardTitle>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest mt-2 bg-white text-brand border-0">Total: {vm.grandTotal}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto no-scrollbar max-h-[70vh] min-h-[450px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas/30 text-[9px] font-bold uppercase tracking-widest text-ink-soft/80 border-b border-line">
                  <th className="sticky top-0 z-20 px-3 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 min-w-70">Descripción del Uso</th>
                  <th className="sticky top-0 z-20 px-3 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 min-w-35 text-center">Sigla</th>
                  <th className="sticky top-0 z-20 px-3 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 w-25 text-right">Total</th>
                  {vm.zones.map(z => (
                    <th key={z} className="sticky top-0 z-20 px-3 py-2 bg-canvas/95 backdrop-blur-sm border-r border-line/30 min-w-30 text-right">{z}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {vm.rows.map((row, index) => (
                  <tr key={row.landUseName} className={cn("hover:bg-brand-mint/20 transition-colors", index % 2 === 0 ? "bg-white" : "bg-canvas/60")}>
                    <td className="px-3 py-1.5 text-xs font-bold text-ink border-r border-black/8">{row.landUseName}</td>
                    <td className="px-3 py-1.5 text-center border-r border-black/8"><Badge variant="brand" className="px-2 py-0.5 rounded-md text-[8px] font-bold tracking-widest">{row.landUseInitials}</Badge></td>
                    <td className="px-3 py-1.5 text-right font-bold text-brand border-r border-black/8 text-xs">{row.total}</td>
                    {row.byZone.map((count, idx) => (
                      <td key={idx} className="px-3 py-1.5 text-right text-xs font-medium text-ink-soft border-r border-black/8">{count}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="sticky bottom-0 z-10 bg-brand-deep text-white font-bold uppercase text-xs">
                  <td colSpan={2} className="px-3 py-2 text-right border-r border-white/10">Total General</td>
                  <td className="px-3 py-2 text-right border-r border-white/10 text-xs">{vm.grandTotal}</td>
                  {vm.totalsByZone.map((t, idx) => (
                    <td key={idx} className="px-3 py-2 text-right border-r border-white/10 text-xs">{t}</td>
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
