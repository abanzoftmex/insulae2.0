import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import type { Metadata } from "next";
import Link from "next/link";
import type { CondominiumOverviewVM } from "@/modules/condominium/presentation/condominium-overview.vm";
import { CondominioEditor } from "./condominio-editor";
import { Badge } from "@/components/ui/badge";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MapPin,
  Activity,
  Database,
  ShieldCheck,
  Building,
  Layers,
  Users,
  Info
} from "lucide-react";

export const metadata: Metadata = {
  title: "Condominio | Insulae 2.0",
  description: "Configuración general, métricas de inventario y salud operativa del condominio.",
};

export const dynamic = "force-dynamic";

export default async function CondominioPage() {
  await requirePageAccess(MODULES.CONDOMINIO);

  let overview: CondominiumOverviewVM | null = null;
  let editorInitialValues = {
    projectId: "",
    projectName: "",
    projectInitials: "",
    projectDescription: "",
    privacyNoticeText: "",
    startYear: "",
    condominiumFormatId: "",
    totalM2: "",
    totalApoles: "",
    commonAreasM2: "",
    privateAreasM2: "",
    developedBy: "",
    usesLandUseFormula: false,
    hasVccc: false,
    footerLeft: "",
    footerRight: "",
    condominiumLogoUrl: "",
    condominiumImageUrl: "",
    footerLogoUrl: "",
    privacyNoticePdfUrl: "",
    cus: "",
    cusPermitido: "",
    barrios: "",
    totalConstruccion: "",
    cosPrivativo: "",
    cosComun: "",
    commonAreaHaloVerde: "",
    commonAreaEquipamiento: "",
    commonAreaEstacionamiento: "",
    commonAreaCalles: "",
  };
  let hasLoadError = false;
  let caDetails = {
    haloVerde: { m2: "", count: 0 },
    equipamiento: { m2: "", count: 0 },
    estacionamiento: { m2: "", count: 0 },
    calles: { m2: "", count: 0 }
  };

  try {
    const [{ getCondominiumOverviewUseCase }, { toCondominiumOverviewVM }] = await Promise.all([
      import("@/modules/condominium"),
      import("@/modules/condominium/presentation/condominium-overview.vm"),
    ]);

    const response = await getCondominiumOverviewUseCase.execute();
    overview = response ? toCondominiumOverviewVM(response) : null;
    if (response) {
      const { prisma } = await import("@/shared/infrastructure/db/prisma");
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

      caDetails = {
        haloVerde: findCA("Halo Verde"),
        equipamiento: findCA("Áreas comunes zona de equipamiento"),
        estacionamiento: findCA("Estacionamiento"),
        calles: findCA("Áreas comunes Calles")
      };

      editorInitialValues = {
        projectId: response.projectId ?? "",
        projectName: response.projectName ?? "",
        projectInitials: response.projectInitials ?? "",
        projectDescription: response.projectDescription ?? "",
        privacyNoticeText: response.privacyNoticeText ?? "",
        startYear: response.startYear?.toString() ?? "",
        condominiumFormatId: response.condominiumFormatId?.toString() ?? "",
        totalM2: response.totalM2 ? response.totalM2.toString() : "",
        totalApoles: response.totalApoles ? response.totalApoles.toString() : "",
        commonAreasM2: response.commonAreasM2 ? response.commonAreasM2.toString() : "",
        privateAreasM2: response.privateAreasM2 ? response.privateAreasM2.toString() : "",
        developedBy: response.developedBy ?? "",
        usesLandUseFormula: response.usesLandUseFormula,
        hasVccc: response.hasVccc,
        footerLeft: response.footerLeft ?? "",
        footerRight: response.footerRight ?? "",
        condominiumLogoUrl: response.condominiumLogoUrl ?? "",
        condominiumImageUrl: response.condominiumImageUrl ?? "",
        footerLogoUrl: response.footerLogoUrl ?? "",
        privacyNoticePdfUrl: response.privacyNoticePdfUrl ?? "",
        cus: response.cus ? response.cus.toString() : "",
        cusPermitido: response.cusPermitido ? response.cusPermitido.toString() : "",
        barrios: response.barrios ? response.barrios.toString() : "",
        totalConstruccion: response.totalConstruccion ? response.totalConstruccion.toString() : "",
        cosPrivativo: response.cosPrivativo ? response.cosPrivativo.toString() : "",
        cosComun: response.cosComun ? response.cosComun.toString() : "",
        commonAreaHaloVerde: caDetails.haloVerde.m2,
        commonAreaEquipamiento: caDetails.equipamiento.m2,
        commonAreaEstacionamiento: caDetails.estacionamiento.m2,
        commonAreaCalles: caDetails.calles.m2,
      };
    }
  } catch (error) {
    console.error("[CondominioPage] Failed to load overview", error);
    hasLoadError = true;
  }

  const activeCount = overview ? overview.realActiveParentAreas : 0;
  const totalCapacity = overview ? overview.totalCapacityApoles : 0;
  // For display, use configured capacity as denominator; if 0 fall back to active count
  const displayTotal = totalCapacity > 0 ? totalCapacity : activeCount;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">
              Configuración del Condominio
            </h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
              Ajustes Maestro
            </Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {overview?.projectName || "Sin Proyecto"} · Gestión de datos y parámetros operativos del condominio.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase shadow-md shadow-brand-deep/25">
            <Link href="/reporte-condominio">
              <Activity className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Ver Reporte
            </Link>
          </Button>
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase shadow-md shadow-brand-deep/25">
            <Link href="/reglamentos">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Gestión Legal
            </Link>
          </Button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          accent="cyan"
          label="APoLes Activos"
          value={overview?.activePrivateAreas ?? "0"}
          icon={<Layers className="h-3.5 w-3.5" />}
        />
        <StatCard accent="brand" label="M2 Privativos" value={overview ? `${overview.totalPrivateAreaM2}` : "0"} icon={<MapPin className="h-3.5 w-3.5" />} />
        <StatCard accent="gold" label="Documentos Registrados" value={overview?.projectDocumentCount ?? "0"} icon={<FileText className="h-3.5 w-3.5" />} />
        <StatCard accent="cyan" label="Usuarios Activos" value={overview?.activeUsers ?? "0"} icon={<Users className="h-3.5 w-3.5" />} />
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Column 1: Identidad y Formato */}
        <Card className="shadow-layered border-transparent flex flex-col h-full bg-card">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Identidad del Condominio</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 space-y-3.5">
            {[
              { label: "Nombre Comercial", value: overview?.projectName },
              { label: "Nomenclatura", value: overview?.projectInitials },
              { label: "Tipo de Condominio", value: overview?.condominiumFormat },
              { label: "Año Arranque", value: overview?.startYear },
              { label: "Desarrollado Por", value: overview?.developedBy },
              { label: "Fórmula de Suelo", value: overview?.usesLandUseFormula ? "Sí" : "No" },
              { label: "Manejo VCCC", value: overview?.hasVccc ? "Sí" : "No" },
            ].map((f, i) => (
              <div key={i} className="flex justify-between items-center gap-4 py-2 border-b border-line last:border-0">
                <span className="text-[10px] font-bold uppercase text-ink-soft/70 tracking-tight">{f.label}</span>
                <span className="text-xs font-bold text-ink text-right break-all">{f.value || "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Column 2: Desglose de Superficies */}
        <Card className="shadow-layered border-transparent flex flex-col h-full bg-card">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Distribución de Superficies</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 space-y-4">
            <div className="space-y-2.5">
              {[
                {
                  label: "Total Lotes",
                  value: overview?.totalApoles,
                  sub: overview && overview.totalCapacityApoles !== overview.realActiveParentAreas
                    ? `${overview.realActiveParentAreas} registrados en sistema`
                    : null
                },
                { label: "Superficie Privativa", value: overview ? `${overview.privateAreasM2} m2` : null },
                { label: "Superficie Común", value: overview ? `${overview.commonAreasM2} m2` : null },
              ].map((f, i) => (
                <div key={i} className="bg-canvas border border-line/60 rounded-xl p-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[9px] font-extrabold uppercase text-ink-soft/80 tracking-widest">{f.label}</span>
                    <span className="text-sm font-black text-brand-deep">{f.value || "—"}</span>
                  </div>
                  {f.sub && <p className="text-[9px] text-amber-600 font-bold uppercase mt-1 tracking-tight">{f.sub}</p>}
                </div>
              ))}
            </div>

            <div className="border-t border-line/40 pt-3 space-y-2">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-brand-deep/60 mb-2">Desglose de Áreas Comunes:</p>
              {[
                {
                  label: "Estacionamiento",
                  value: caDetails.estacionamiento.m2
                    ? `${parseFloat(caDetails.estacionamiento.m2).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 6 })} m2`
                    : "—",
                  count: caDetails.estacionamiento.count
                },
                {
                  label: "Calles comunes",
                  value: caDetails.calles.m2
                    ? `${parseFloat(caDetails.calles.m2).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 6 })} m2`
                    : "—",
                  count: caDetails.calles.count
                },
                {
                  label: "Halo Verde",
                  value: caDetails.haloVerde.m2
                    ? `${parseFloat(caDetails.haloVerde.m2).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 6 })} m2`
                    : "—",
                  count: caDetails.haloVerde.count
                },
                {
                  label: "Equipamiento",
                  value: caDetails.equipamiento.m2
                    ? `${parseFloat(caDetails.equipamiento.m2).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 6 })} m2`
                    : "—",
                  count: caDetails.equipamiento.count
                },
              ].map((c, i) => (
                <div key={i} className="flex justify-between items-center gap-2 text-xs py-1 border-b border-line/30 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-ink-soft">{c.label}</span>
                    {c.count > 0 && <span className="text-[8px] text-amber-600 font-semibold uppercase">{c.count} fracciones</span>}
                  </div>
                  <span className="font-mono font-bold text-brand">{c.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Coeficientes y Estado */}
        <div className="flex flex-col gap-5 h-full">
          {/* Card: Estado del Condominio */}
          <Card className="shadow-layered border-transparent bg-brand-deep text-white">
            <CardHeader className="px-4 py-3 border-b border-white/10">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-brand-mint">Estado del Condominio</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-[9px] font-bold uppercase text-white/50 tracking-widest">Estado de Lotes</p>
                  <p className="text-2xl font-black text-white">{overview ? `${overview.activeRatio.toFixed(1)}%` : "0%"}</p>
                </div>
                {overview && (
                  <p className="text-[9px] text-brand-mint/90 font-bold uppercase tracking-wide mt-0.5">
                    {overview.realActiveParentAreas} activos de {displayTotal.toLocaleString("es-MX")} áreas
                  </p>
                )}
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent transition-all duration-700" style={{ width: `${overview?.activeRatio || 0}%` }} />
              </div>
              <div className="flex flex-col gap-2 pt-2.5 border-t border-white/10">
                <div className="flex items-center gap-2 text-[9px] font-bold text-white/60 uppercase tracking-tight">
                  <ShieldCheck className="h-3 w-3 text-brand-mint shrink-0" />
                  <span>{overview?.privateAreasWithUseType || 0} apoles con uso de suelo</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-white/60 uppercase tracking-tight">
                  <Building className="h-3 w-3 text-brand-mint shrink-0" />
                  <span>{overview?.totalApoles || 0} apoles configurados</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Coeficientes Urbanísticos */}
          <Card className="shadow-layered border-transparent bg-card flex-1">
            <CardHeader className="px-4 py-2.5 border-b border-brand/40 bg-brand rounded-t-card">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Coeficientes Urbanísticos (CUS/COS)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { label: "CUS del Proyecto", value: overview && overview.cus !== "Sin definir" ? overview.cus : null },
                { label: "CUS Máximo Permitido", value: overview && overview.cusPermitido !== "Sin definir" ? overview.cusPermitido : null },
                { label: "Superficie de Construcción", value: overview && overview.totalConstruccion !== "Sin definir" ? `${overview.totalConstruccion} m2` : null },
                { label: "COS Área Privativa", value: overview && overview.cosPrivativo !== "Sin definir" ? overview.cosPrivativo : null },
                { label: "COS Área Común", value: overview && overview.cosComun !== "Sin definir" ? overview.cosComun : null },
                { label: "Barrios Configurados", value: overview && overview.barrios !== "Sin definir" ? overview.barrios : null },
              ].map((f, i) => (
                <div key={i} className="flex justify-between items-center gap-3 py-1.5 border-b border-line/30 last:border-0">
                  <span className="text-[9px] font-bold uppercase text-ink-soft/70 tracking-tight">{f.label}</span>
                  <span className="text-xs font-black text-brand-deep">{f.value || "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editor Section */}
      <div className="pt-4 animate-in slide-in-from-bottom-4 duration-700 delay-300">
        <CondominioEditor
          condominiumSlug={overview?.condominiumSlug ?? PROJECT_SCOPE.condominiumCode}
          initialValues={editorInitialValues}
        />
      </div>

      {hasLoadError && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-center gap-2 text-danger text-[11px] font-bold uppercase">
          <Info className="h-4 w-4" /> Error al sincronizar datos en tiempo real. Mostrando caché segura.
        </div>
      )}
    </div>
  );
}
