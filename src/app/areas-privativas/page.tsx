import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  getPrivateAreaLegacyActionsUseCase,
  type PrivateAreaLegacyAction,
} from "@/modules/private-area-actions";
import { getPrivateAreaListingUseCase } from "@/modules/private-areas";
import { toPrivateAreaListingVM } from "@/modules/private-areas/presentation/private-area-listing.vm";
import { CsvManager } from "./_components/csv-manager";
import { getCondominiumReportUseCase } from "@/modules/condominium-report";
import { toCondominiumReportVM } from "@/modules/condominium-report/presentation/condominium-report.vm";

import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Paginator } from "@/components/ui/paginator";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/utils/cn";
import { 
  Shield, 
  FileText, 
  Settings, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Layers,
  Activity,
  User,
  ShoppingBag,
  Home,
  Mail,
  Phone,
  Pencil,
  Images,
  Receipt,
  Store,
  Briefcase,
  Wallet,
  Plus,
  X,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Areas Privativas | Insulae 2.0",
  description: "Inventario maestro de áreas privativas con gestión financiera y operativa.",
};

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function pickParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return (Number.isNaN(parsed) || parsed <= 0) ? fallback : parsed;
}

function renderHierarchyBadge(label: string): ReactNode {
  const map: Record<string, string> = {
    "Individual": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "Padre":      "bg-purple-100 text-purple-800 border-purple-200",
    "Hijo":       "bg-lime-100 text-lime-800 border-lime-200",
    "Fusion":     "bg-gold-soft text-gold border-gold/30",
  };
  const cls = map[label] ?? "bg-canvas text-ink-soft border-line/40";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

function renderPartyContacts(contacts: Array<{ name: string; email: string | null; phone: string | null }>): ReactNode {
  if (contacts.length === 0) return <span className="text-ink-soft/40">—</span>;
  return (
    <div className="space-y-1.5 py-0.5">
      {contacts.map((contact, index) => (
        <div key={index} className="rounded-md border border-lime-200 bg-lime-50 px-2 py-1.5 space-y-1">
          <p className="text-xs font-bold text-ink leading-tight">{contact.name}</p>
          {contact.email && (
            <span className="inline-flex items-center gap-1 rounded-full bg-lime-100 border border-lime-200 px-2 py-0.5 text-[10px] font-bold text-lime-800">
              <Mail className="h-2.5 w-2.5 shrink-0" />
              {contact.email}
            </span>
          )}
          {!contact.email && (
            <span className="inline-flex items-center gap-1 rounded-full bg-lime-50 border border-lime-100 px-2 py-0.5 text-[10px] font-bold text-ink-soft/50">
              <Mail className="h-2.5 w-2.5 shrink-0" />
              S/C
            </span>
          )}
          {contact.phone && (
            <span className="inline-flex items-center gap-1 rounded-full bg-lime-100 border border-lime-200 px-2 py-0.5 text-[10px] font-bold text-lime-800">
              <Phone className="h-2.5 w-2.5 shrink-0" />
              {contact.phone}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function renderFinancialCards(
  ownerAmount: string,
  commerceAmount: string,
  showCommerce: boolean,
  paymentStatusColor?: "green" | "red" | "yellow"
): ReactNode {
  const isZeroOrMuted = (amount: string) => {
    const clean = amount.trim();
    if (clean.startsWith("-")) {
      return true;
    }
    const hasNonZeroDigits = /[1-9]/.test(clean);
    return !hasNonZeroDigits;
  };

  const getCardStyle = (amount: string, isOwner: boolean) => {
    if (isZeroOrMuted(amount)) {
      return {
        bgClass: "bg-emerald-50 border-emerald-100",
        labelClass: "text-emerald-600/60",
        valueClass: "text-[#16a34a] font-bold"
      };
    }

    if (paymentStatusColor === "red") {
      return {
        bgClass: "bg-rose-50 border-rose-100",
        labelClass: "text-rose-600/60",
        valueClass: "text-[#dc2626] font-bold"
      };
    }
    if (paymentStatusColor === "yellow") {
      return {
        bgClass: "bg-amber-50 border-amber-100",
        labelClass: "text-amber-600/60",
        valueClass: "text-[#d97706] font-bold"
      };
    }
    if (paymentStatusColor === "green") {
      return {
        bgClass: "bg-emerald-50 border-emerald-100",
        labelClass: "text-emerald-600/60",
        valueClass: "text-[#16a34a] font-bold"
      };
    }

    if (isOwner) {
      return {
        bgClass: "bg-brand-deep/3 border-brand-deep/5",
        labelClass: "text-brand-deep/60",
        valueClass: "text-brand-deep font-bold"
      };
    } else {
      return {
        bgClass: "bg-danger/5 border-danger/5",
        labelClass: "text-danger/60",
        valueClass: "text-danger/80 font-bold"
      };
    }
  };

  const ownerStyle = getCardStyle(ownerAmount, true);
  const commerceStyle = getCardStyle(commerceAmount, false);

  return (
    <div className="space-y-0.5">
      <div className={cn("flex items-center justify-between gap-2 px-1.5 py-0.5 rounded border transition-colors", ownerStyle.bgClass)}>
        <span className={cn("text-[8px] font-bold", ownerStyle.labelClass)}>P</span>
        <span className={cn("text-xs", ownerStyle.valueClass)}>{ownerAmount}</span>
      </div>
      {showCommerce && (
        <div className={cn("flex items-center justify-between gap-2 px-1.5 py-0.5 rounded border transition-colors", commerceStyle.bgClass)}>
          <span className={cn("text-[8px] font-bold", commerceStyle.labelClass)}>C</span>
          <span className={cn("text-xs", commerceStyle.valueClass)}>{commerceAmount}</span>
        </div>
      )}
    </div>
  );
}

const ACTION_META: Record<
  PrivateAreaLegacyAction["id"],
  { icon: ReactNode; activeClass: string }
> = {
  EDIT_BASE: {
    icon: <Pencil className="h-3 w-3" />,
    activeClass:
      "bg-brand-accent/10 border-brand-accent/25 text-brand-accent hover:bg-brand-accent hover:text-white hover:border-brand-accent",
  },
  EDIT_IMAGES: {
    icon: <Images className="h-3 w-3" />,
    activeClass:
      "bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-600 hover:text-white hover:border-cyan-600",
  },
  OWNER_PAYMENTS: {
    icon: <Wallet className="h-3 w-3" />,
    activeClass:
      "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600",
  },
  COMMERCE_PAYMENTS: {
    icon: <Briefcase className="h-3 w-3" />,
    activeClass:
      "bg-gold-soft border-gold/30 text-gold hover:bg-gold hover:text-white hover:border-gold",
  },
  RENTALS: {
    icon: <Store className="h-3 w-3" />,
    activeClass:
      "bg-lime-50 border-lime-200 text-lime-700 hover:bg-lime-600 hover:text-white hover:border-lime-600",
  },
  ADD_FAP: {
    icon: <Plus className="h-3 w-3" />,
    activeClass:
      "bg-green-600 border-green-700 text-white hover:bg-green-700 hover:border-green-800",
  },
};

function renderLegacyAction(action: PrivateAreaLegacyAction): ReactNode {
  const meta = ACTION_META[action.id];

  if (!action.isEnabled || !action.href) {
    return (
      <span
        key={action.id}
        title={action.label}
        className="h-6 w-6 flex items-center justify-center rounded border border-line/40 bg-canvas/30 text-ink-soft/20 cursor-not-allowed"
      >
        {meta.icon}
      </span>
    );
  }

  return (
    <Link
      key={action.id}
      href={action.href}
      title={action.label}
      className={`h-6 w-6 flex items-center justify-center rounded border transition-all active-scale ${meta.activeClass}`}
    >
      {meta.icon}
    </Link>
  );
}

// Using Paginator from @/components/ui/paginator

export default async function AreasPrivativasPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = searchParams ?? {};

  const query = pickParam(params.q) ?? "";
  const useType = pickParam(params.useType) ?? "";
  const status = pickParam(params.status) ?? "ACTIVE";
  const m2Min = parseNumber(pickParam(params.m2Min));
  const m2Max = parseNumber(pickParam(params.m2Max));
  const page = parsePositiveInteger(pickParam(params.page), 1);
  const pageSize = Math.max(30, parsePositiveInteger(pickParam(params.pageSize), 30));

  const listing = await getPrivateAreaListingUseCase.execute({
    query, useType, status, m2Min, m2Max, page, pageSize, paginateByTopLevel: true,
  });

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para construir la vista.</p>
      </div>
    );
  }

  const legacyActionsByPrivateAreaId = await getPrivateAreaLegacyActionsUseCase.execute(
    listing.rows.map(row => ({ privateAreaId: row.id, isActive: row.isActive, hierarchyRole: row.hierarchyRole }))
  );

  const vm = toPrivateAreaListingVM(listing);

  const report = await getCondominiumReportUseCase.execute();
  const reportVm = report ? toCondominiumReportVM(report) : null;
  
  const shortMonths = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  let monthLabels: { label: string; key: string }[] = [];
  const startDate = new Date(Date.UTC(2025, 0, 1));
  const endDate = new Date(Date.UTC(2026, 11, 1));
  let curr = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
  
  while (curr <= end) {
    const m = curr.getUTCMonth();
    const y = curr.getUTCFullYear();
    monthLabels.push({ label: `${shortMonths[m]} ${y}`, key: `month_${y}_${m + 1}` });
    curr.setUTCMonth(curr.getUTCMonth() + 1);
  }

  const colWidths = [
    100, // Acciones
    110, // Ubicacion
    290, // Apoles
    100, // Tipo de Apol
    60, // Nivel
    110, // Superficie
    110, // Superficie Orig
    80, // Indiviso
    110, // Areas Comunes
    110, // Totales
    140, // m2 construcción áreas comunes
    140, // Construccion
    140, // Comunes Sub
    140, // Totales FAP
    110, // % Indiviso FAP
    140, // Indiviso Cond
    110, // Uso Suelo
    160, // Cartera Vencida
    160, // Anticipado
    180, // Ordinary 2025 Annual
    180, // Ordinary 2025 Monthly
    180, // Ordinary 2025 Outstanding
    180, // Ordinary 2026 Annual
    180, // Ordinary 2026 Monthly
    180, // Ordinary 2026 Outstanding
    180, // Extra Condo
    180, // Extra Condo Saldo
    180, // Extra Com
    180, // Extra Com Saldo
    140, // STC
    140, // STC Saldo
    140, // Sancion
    140, // Sancion Saldo
    140, // Comodato
    140, // Comodato Saldo
    160, // Saldo Actual
    ...Array(monthLabels.length).fill(110),
    220, // Propietario Inicial
    220, // Propietario Legal
    220, // Dominio Actual
    220, // Dominio Pleno
    220, // Arrendatario
    220, // Contacto Admin
    220, // Contacto Oper
  ];

  const fullTableWidth = colWidths.reduce((a, b) => a + b, 0);

  const buildHref = (nextPage: number) => {
    const url = new URLSearchParams();
    if (vm.filters.query) url.set("q", vm.filters.query);
    if (vm.filters.useType) url.set("useType", vm.filters.useType);
    if (vm.filters.status && vm.filters.status !== "ALL") url.set("status", vm.filters.status);
    if (vm.filters.m2Min) url.set("m2Min", vm.filters.m2Min);
    if (vm.filters.m2Max) url.set("m2Max", vm.filters.m2Max);
    url.set("pageSize", String(vm.pagination.pageSize));
    url.set("page", String(nextPage));
    return `/areas-privativas?${url.toString()}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Inventario de Áreas Privativas</h1>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Gestión maestra de superficies, usos de suelo y estado de cartera operativa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CsvManager />
          <Button variant="primary" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full bg-gold hover:bg-[#bca065] text-white shadow-md shadow-brand-deep/15 transition-all active-scale">
            <Link href="/areas-privativas/nueva">
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden /> Nueva AP
            </Link>
          </Button>
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25">
            <Link href="/listado-seguridad"><Shield className="h-3.5 w-3.5 shrink-0" aria-hidden /> Seguridad</Link>
          </Button>
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25">
            <Link href="/reporte-condominio"><FileText className="h-3.5 w-3.5 shrink-0" aria-hidden /> Reporte</Link>
          </Button>
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25">
            <Link href="/condominio"><Settings className="h-3.5 w-3.5 shrink-0" aria-hidden /> Configuración</Link>
          </Button>
        </div>
      </div>

      {/* Comparisons / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard accent="brand" label="Lotes Totales" value={vm.summary.projectTotalApoles} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard accent="cyan" label="M2 Privativos" value={vm.summary.projectTotalM2} icon={<MapPin className="h-3.5 w-3.5" />} />
        <StatCard accent="lime" label="Lotes Construidos" value={vm.summary.legacyBuiltLots} icon={<Home className="h-3.5 w-3.5" />} />
      </div>

      {reportVm && (
        <Card className="shadow-layered border-transparent">
          <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">Datos Técnicos Generales</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sección 1: Totales de Proyecto */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-brand tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand" /> Total de m2 legales del condominio
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Áreas privativas / lotes totales</span>
                    <span className="font-bold text-ink">{reportVm.projectTotalApoles}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Superficie total
                      <span className="ml-1 text-[9px] text-brand/50 font-normal">(configurado en /condominio)</span>
                    </span>
                    <span className="font-bold text-ink">{reportVm.projectTotalM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">M2 de áreas privativas totales
                      <span className="ml-1 text-[9px] text-brand/50 font-normal">(configurado en /condominio)</span>
                    </span>
                    <span className="font-bold text-ink">{reportVm.projectPrivateAreasM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">M2 de áreas comunes
                      <span className="ml-1 text-[9px] text-brand/50 font-normal">(configurado en /condominio)</span>
                    </span>
                    <span className="font-bold text-ink">{reportVm.projectCommonAreasM2} m²</span>
                  </div>
                </div>
              </div>

              {/* Sección 2: Operativos Reales (Padres) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-canvas border border-line/50 hover:shadow-sm transition-all duration-300">
                <h4 className="text-[9px] font-extrabold uppercase text-cyan-600 tracking-widest flex items-center gap-1.5 border-b border-line pb-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" /> Total de m2 reales
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Áreas privativas / lotes</span>
                    <span className="font-bold text-ink">{reportVm.parentAreasCount}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Superficie total
                      <span className="ml-1 text-[9px] text-cyan-600/50 font-normal">(calculado con áreas)</span>
                    </span>
                    <span className="font-bold text-ink">{reportVm.parentTotalM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">M2 de áreas privativas / lotes</span>
                    <span className="font-bold text-ink">{reportVm.parentAreasM2} m²</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">M2 de áreas comunes subcondominio (lotes)</span>
                    <span className="font-bold text-ink">{reportVm.parentAreasCommonM2} m²</span>
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
                    <span className="font-bold text-yellow-700">{reportVm.availableAreas}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Lotes construidos (Sombras)</span>
                    <span className="font-bold text-blue-700">{reportVm.builtAreas}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">Porcentajes del condominio</span>
                    <span className="font-extrabold text-[10px] text-ink-soft">{reportVm.availableRatio} soles / {reportVm.builtRatio} sombras</span>
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
                    <span className="font-bold text-ink">{reportVm.activeChildren}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-line/30">
                    <span className="text-ink-soft font-medium">Fusiones de Áreas / lotes</span>
                    <span className="font-bold text-ink">{reportVm.activeFusionsCount}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-ink-soft font-medium">Fracción indiviso total</span>
                    <span className="font-bold text-ink">{reportVm.totalIndiviso}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filter */}
      <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2">
          <Filter className="h-3 w-3 text-white/70" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-white">Filtros de búsqueda</p>
        </div>
        <form className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end" method="get">
          <Input label="Buscar" name="q" defaultValue={vm.filters.query} placeholder="Código, nombre..." className="h-8 text-xs" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Uso Suelo</label>
            <select name="useType" defaultValue={vm.filters.useType} className="h-8 w-full rounded-md border border-line bg-card px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent appearance-none">
              <option value="">Todos los usos</option>
              {vm.facets.useTypes.map(o => <option key={o.value} value={o.value}>{o.label} ({o.count})</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Estatus</label>
            <select name="status" defaultValue={vm.filters.status} className="h-8 w-full rounded-md border border-line bg-card px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent appearance-none">
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </div>
          <Input label="M2 Min" name="m2Min" type="number" step="0.01" defaultValue={vm.filters.m2Min} className="h-8 text-xs" />
          <Input label="M2 Max" name="m2Max" type="number" step="0.01" defaultValue={vm.filters.m2Max} className="h-8 text-xs" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70 leading-none">Registros</label>
            <select name="pageSize" defaultValue={vm.filters.pageSize} className="h-8 w-full rounded-md border border-line bg-card px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-accent appearance-none">
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="80">80</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="h-8 text-[10px] font-bold uppercase gap-1.5 flex-1">
              <Filter className="h-3 w-3" /> Filtrar
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-bold uppercase px-3 border border-line hover:bg-canvas transition-colors">
              <Link href="/areas-privativas" title="Eliminar filtros">
                <X className="h-3.5 w-3.5 text-ink-soft" />
              </Link>
            </Button>
          </div>
        </form>
      </div>

      {/* Paginator top */}
      <Paginator 
        page={vm.pagination.page}
        totalPages={vm.pagination.totalPages}
        totalRows={vm.pagination.totalRows}
        hasPrev={vm.pagination.hasPrev}
        hasNext={vm.pagination.hasNext}
        prevHref={buildHref(Math.max(1, vm.pagination.page - 1))}
        nextHref={buildHref(Math.min(vm.pagination.totalPages, vm.pagination.page + 1))}
      />

      {/* Main Extensive Table */}
      <section className="overflow-hidden border-t border-b border-[#c8b59d]/50 bg-white/88 shadow-[0_14px_36px_rgba(30,18,8,0.10)] backdrop-blur-sm -mx-4 md:-mx-6 lg:-mx-10 -mb-4 md:-mb-6 lg:-mb-8 rounded-none">
        <style dangerouslySetInnerHTML={{ __html: `
          .fap-inventory-table td {
            border-top: 1px solid #e5d8c8 !important;
          }
          .fap-block-start td {
            border-top: 2.5px solid #a89678 !important;
          }
          .fap-block-end td {
            border-bottom: 2.5px solid #a89678 !important;
          }
        `}} />
        <div className="overflow-auto max-h-[75vh]">
          <table className="fap-inventory-table table-fixed border-separate border-spacing-0" style={{ width: `${fullTableWidth}px` }}>
            <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}</colgroup>
            
            {/* THEAD */}
            <thead className="sticky top-0 z-30 shadow-sm">
              <tr className="bg-[#e0d5c8] text-left text-[10px] font-bold uppercase tracking-widest text-[#5a4838]">
                <th className="sticky left-0 top-0 z-50 px-2 py-3 border-b border-r border-[#c8b49a] bg-[#e0d5c8]">Acciones</th>
                <th className="sticky left-[100px] top-0 z-50 px-3 py-3 border-b border-r border-[#c8b49a] bg-[#e0d5c8]">Ubicación</th>
                <th className="sticky left-[210px] top-0 z-50 px-3 py-3 border-b border-r-2 border-[#c8b49a] bg-[#e0d5c8]">Área privativa/ Fracción de área privativa</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Tipo de Apol</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Nivel</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Superficie m2 área privativa actualizado</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Superficie m2 área privativa original</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Indiviso del área privativa</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">m2 Áreas comunes del condominio</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">m2 Totales área privativa</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">m2 construcción áreas comunes</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">m2 de construcción AP/FAP</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">m2 Áreas comunes subcondominio</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">m2 Totales FAP</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">% Indiviso FAP</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Indiviso FAP/Condominio</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Uso de suelo</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] bg-brand-deep/3 text-brand-deep/50">Cartera vencida 2017-2024</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0] bg-brand-deep/3 text-brand-deep/50">Pago Anticipado 2024</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas ordinarias 2025 (anual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas ordinarias 2025 (mensual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas ordinarias 2025 (saldo actual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas ordinarias 2026 (anual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas ordinarias 2026 (mensual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas ordinarias 2026 (saldo actual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas extraordinarias - Condóminos 2024 - 2025</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas extraordinarias - Condóminos 2024 - 2025 (saldo actual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuota extraordinaria - Comercios 2024 - 2025</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuota extraordinaria - Comercios 2024 - 2025 (saldo actual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas STC</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Cuotas STC (saldo actual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Sanción</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Sanción (saldo actual)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Comodato</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Comodato (saldo actual)</th>
                <th className="px-3 py-3 border-b border-[#d0b898] bg-[#f0e0c8] text-[#6a3810] font-bold">Saldo actual</th>
                {monthLabels.map(m => (
                  <th key={m.key} className="px-3 py-3 border-b border-[#d8c8b4] bg-[#ece5d8] text-[9px] font-semibold text-[#7a5e44] leading-snug">{m.label}</th>
                ))}
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Propietario inicial<br />(BLOCKCHAIN) Historia</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Propietario legal<br />(Esta columna es para el INIDIVISO)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Dominio actual<br />(Esta columna es para el ESTADO DE CUENTA)</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Dominio pleno</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Arrendatario / Usuario</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Contacto administrativo del arrendamiento</th>
                <th className="px-3 py-3 border-b border-[#c8b8a0] bg-[#e8ddd0]">Contacto operativo del arrendamiento</th>
              </tr>
            </thead>

            {/* TBODY */}
            <tbody className="divide-y divide-[#e8ddd0] text-[#2b1e12]">
              {vm.rows.map((row, rowIdx) => {
                const actions = legacyActionsByPrivateAreaId[row.id] ?? [];
                const hasCom = row.hasRentalLabel === "Si";
                const empty = "$0.00";
                const f = (k: string) => {
                  const s = row.financialCells[k as keyof typeof row.financialCells];
                  return renderFinancialCards(s?.owner ?? empty, s?.commerce ?? empty, hasCom, row.paymentStatusColor);
                };

                const isParent = row.hierarchyLabel === "Padre";
                const isChild = row.hierarchyLabel === "Hijo";

                const isBlockStart = isParent;
                const nextRow = vm.rows[rowIdx + 1];
                const isBlockEnd = (isChild || isParent) && (!nextRow || nextRow.hierarchyLabel !== "Hijo");

                const rowBg = isParent
                  ? "bg-[#dfcfb9]"
                  : isChild
                  ? "bg-[#f0e6d6]"
                  : "bg-white";

                const blockRowClass = cn(
                  isBlockStart && "fap-block-start",
                  isBlockEnd && "fap-block-end",
                  isParent && "fap-parent",
                  isChild && "fap-child"
                );
                
                return (
                  <tr key={`${row.id}-${rowIdx}`} className={cn("h-12 border-t border-[#e8ddd0] transition-colors hover:brightness-[0.97] group", rowBg, blockRowClass)}>
                    
                    {/* Sticky Column 1: Acciones */}
                    <td className={cn("sticky left-0 z-20 px-2 py-1.5 border-r border-[#ddd0be] shadow-[2px_0_5px_rgba(30,18,8,0.02)] transition-colors", rowBg)}>
                      <div className="flex flex-wrap gap-1 w-[80px]">{actions.map(renderLegacyAction)}</div>
                    </td>

                    {/* Sticky Column 2: Ubicación */}
                    <td className={cn("sticky left-[100px] z-20 px-3 text-xs font-bold text-[#5a4838] uppercase border-r border-[#ddd0be] transition-colors", rowBg)}>
                      {row.zone}
                    </td>

                    {/* Sticky Column 3: Área / Fracción */}
                    <td className={cn("sticky left-[210px] z-20 px-3 border-r-2 border-[#ddd0be] shadow-[2px_0_5px_rgba(30,18,8,0.02)] transition-colors", rowBg)}>
                      <p className="font-bold text-[#2b1e12] leading-tight truncate">{row.name}</p>
                      <div className="flex gap-1.5 mt-0.5">
                        <span className="px-1.5 py-px rounded-xs bg-[#faf6f0] border border-[#c8b8a0]/30 text-xs font-bold text-[#7a5e44]/80 uppercase">{row.code}</span>
                        <Badge variant={row.statusTone === "active" ? "success" : "danger"} className="rounded-full px-2 py-0.5 text-[8px] font-bold tracking-widest">{row.statusLabel}</Badge>
                      </div>
                    </td>

                    <td className="px-3 border-r border-[#e8ddd0]">
                      {renderHierarchyBadge(row.hierarchyLabel)}
                      <p className="text-xs text-[#7a5e44]/60 italic mt-0.5">P: {row.parentName}</p>
                    </td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0]">{row.level}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.m2Updated}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.m2Original}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.indiviso}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.m2CommonArea}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums font-bold">{row.totalAreaM2}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.m2ConstructionCommonArea}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.m2Construction}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.m2CommonAreaChildren}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.m2ConstructionChildren}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.indivisoFap}</td>
                    <td className="px-3 text-xs border-r border-[#e8ddd0] tabular-nums">{row.indivisoCondominio}</td>
                    <td className="px-3 border-r border-[#e8ddd0]">
                      <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">{row.useTypeInitials}</Badge>
                    </td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("arrears_2017_2024")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("advance_2024")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("ordinary_2025_annual")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("ordinary_2025_monthly")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("ordinary_2025_outstanding")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("ordinary_2026_annual")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("ordinary_2026_monthly")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("ordinary_2026_outstanding")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("extra_condo_2024_2025")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("extra_condo_2024_2025_outstanding")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("extra_commerce_2024_2025")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("extra_commerce_2024_2025_outstanding")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("stc")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("stc_outstanding")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("sancion")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("sancion_outstanding")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("comodato")}</td>
                    <td className="px-2 border-r border-[#e8ddd0]">{f("comodato_outstanding")}</td>
                    <td className="px-2 border-r-2 border-[#d0b898] bg-[#f0e0c8]/20">{f("total_outstanding")}</td>
                    {monthLabels.map(m => (
                      <td key={m.key} className="px-2 border-r border-[#e8ddd0] opacity-90 scale-95">{f(m.key)}</td>
                    ))}
                    <td className="px-3 border-r border-[#e8ddd0]">{renderPartyContacts(row.ownerInitialHistory)}</td>
                    <td className="px-3 border-r border-[#e8ddd0]">{renderPartyContacts(row.ownerLegal)}</td>
                    <td className="px-3 border-r border-[#e8ddd0]">{renderPartyContacts(row.domainCurrent)}</td>
                    <td className="px-3 border-r border-[#e8ddd0]">{renderPartyContacts(row.domainFull)}</td>
                    <td className="px-3 border-r border-[#e8ddd0]">{renderPartyContacts(row.tenantUsers)}</td>
                    <td className="px-3 border-r border-[#e8ddd0]">{renderPartyContacts(row.rentalAdministrativeContacts)}</td>
                    <td className="px-3">{renderPartyContacts(row.rentalOperationalContacts)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
