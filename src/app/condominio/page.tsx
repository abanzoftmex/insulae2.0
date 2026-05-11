import type { Metadata } from "next";
import Link from "next/link";
import type { CondominiumOverviewVM } from "@/modules/condominium/presentation/condominium-overview.vm";
import { CondominioEditor } from "./condominio-editor";
import { Badge } from "@/components/ui/badge";
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
    developedBy: "",
    usesLandUseFormula: false,
    hasVccc: false,
    footerLeft: "",
    footerRight: "",
    condominiumLogoUrl: "",
    condominiumImageUrl: "",
    footerLogoUrl: "",
    privacyNoticePdfUrl: "",
  };
  let hasLoadError = false;

  try {
    const [{ getCondominiumOverviewUseCase }, { toCondominiumOverviewVM }] = await Promise.all([
      import("@/modules/condominium"),
      import("@/modules/condominium/presentation/condominium-overview.vm"),
    ]);

    const response = await getCondominiumOverviewUseCase.execute();
    overview = response ? toCondominiumOverviewVM(response) : null;
    if (response) {
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
        developedBy: response.developedBy ?? "",
        usesLandUseFormula: response.usesLandUseFormula,
        hasVccc: response.hasVccc,
        footerLeft: response.footerLeft ?? "",
        footerRight: response.footerRight ?? "",
        condominiumLogoUrl: response.condominiumLogoUrl ?? "",
        condominiumImageUrl: response.condominiumImageUrl ?? "",
        footerLogoUrl: response.footerLogoUrl ?? "",
        privacyNoticePdfUrl: response.privacyNoticePdfUrl ?? "",
      };
    }
  } catch (error) {
    console.error("[CondominioPage] Failed to load overview", error);
    hasLoadError = true;
  }

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
              {overview?.projectName || "Sin Proyecto"} · Gestión de metadatos y parámetros operativos.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard accent="cyan" label="APoLes Activos" value={overview?.activePrivateAreas ?? "0"} trend={{ value: `Inactivos: ${overview?.inactivePrivateAreas ?? "0"}`, isUp: true }} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard accent="brand" label="M2 Privativos" value={overview ? `${overview.totalPrivateAreaM2}` : "0"} icon={<MapPin className="h-3.5 w-3.5" />} />
        <StatCard accent="lime" label="Usuarios Directorio" value={overview?.activeUsers ?? "0"} icon={<Users className="h-3.5 w-3.5" />} />
        <StatCard accent="gold" label="Acervos Digitales" value={overview?.projectDocumentCount ?? "0"} icon={<Database className="h-3.5 w-3.5" />} />
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* General Info Card */}
          <Card className="shadow-layered border-transparent">
            <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Ficha de Identidad</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: "Nombre Comercial", value: overview?.projectName },
                  { label: "Sigla Proyecto", value: overview?.projectInitials },
                  { label: "Formato Legal", value: overview?.condominiumFormat },
                  { label: "Año Arranque", value: overview?.startYear },
                  { label: "Superficie Total", value: overview ? `${overview.totalM2} m2` : null },
                  { label: "Inventario Total", value: overview?.totalApoles },
                  { label: "Áreas Comunes", value: overview ? `${overview.commonAreasM2} m2` : null },
                  { label: "Desarrollado Por", value: overview?.developedBy },
                  { label: "Fórmula de Suelo", value: overview?.usesLandUseFormula ? "Sí" : "No" },
                  { label: "Manejo VCCC", value: overview?.hasVccc ? "Sí" : "No" },
                ].map((f, i) => (
                  <div key={i} className="p-3 rounded bg-canvas border border-line/50">
                    <p className="text-[9px] font-bold uppercase text-ink-soft/70 tracking-tight leading-none">{f.label}</p>
                    <p className="text-[12px] font-bold text-ink mt-1.5 break-words">{f.value || "—"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
           {/* Operational Health */}
           <Card className="shadow-layered border-transparent bg-brand-deep text-white">
             <CardHeader className="px-4 py-3 border-b border-white/10">
               <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-brand-mint">Salud Operativa</CardTitle>
             </CardHeader>
             <CardContent className="p-4 space-y-4">
                <div className="flex items-end justify-between gap-3">
                   <p className="text-[9px] font-bold uppercase text-white/50 tracking-widest">Cobertura de APoLes</p>
                   <p className="text-2xl font-bold text-white">{overview ? `${overview.activeRatio.toFixed(1)}%` : "0%"}</p>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-brand-accent transition-all duration-700" style={{ width: `${overview?.activeRatio || 0}%` }} />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-white/60">
                      <ShieldCheck className="h-3 w-3 text-brand-mint" />
                      <span>{overview?.privateAreasWithUseType || 0} con Uso de Suelo</span>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-white/60">
                      <Building className="h-3 w-3 text-brand-mint" />
                      <span>{overview?.totalApoles || 0} Unidades Totales</span>
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>

      {/* Editor Section */}
      <div className="pt-4 animate-in slide-in-from-bottom-4 duration-700 delay-300">
        <CondominioEditor
          condominiumSlug={overview?.condominiumSlug ?? "valquirico"}
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
