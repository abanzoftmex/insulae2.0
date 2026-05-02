import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  getPrivateAreaLegacyActionsUseCase,
  type PrivateAreaLegacyAction,
} from "@/modules/private-area-actions";
import { getPrivateAreaListingUseCase } from "@/modules/private-areas";
import { toPrivateAreaListingVM } from "@/modules/private-areas/presentation/private-area-listing.vm";
import { StickyHorizontalTableFrame } from "./_components/sticky-horizontal-table-frame";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
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
  ExternalLink
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

function renderPartyContacts(contacts: Array<{ name: string; email: string | null; phone: string | null }>): ReactNode {
  if (contacts.length === 0) return <span className="text-ink-soft/20">—</span>;
  return (
    <div className="space-y-1">
      {contacts.map((contact, index) => (
        <div key={index}>
          <p className="font-bold text-ink leading-tight">{contact.name}</p>
          <p className="text-[9px] text-ink-soft/60 uppercase tracking-tighter">
            {contact.email || "S/C"} · {contact.phone || "S/T"}
          </p>
        </div>
      ))}
    </div>
  );
}

function renderFinancialCards(ownerAmount: string, commerceAmount: string, showCommerce: boolean): ReactNode {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2 px-1.5 py-0.5 rounded bg-brand-deep/[0.03] border border-brand-deep/5">
        <span className="text-[8px] font-black text-brand-deep/40">P</span>
        <span className="text-[10px] font-black text-brand-deep/80">{ownerAmount}</span>
      </div>
      {showCommerce && (
        <div className="flex items-center justify-between gap-2 px-1.5 py-0.5 rounded bg-danger/5 border border-danger/5">
          <span className="text-[8px] font-black text-danger/40">C</span>
          <span className="text-[10px] font-black text-danger/80">{commerceAmount}</span>
        </div>
      )}
    </div>
  );
}

function renderLegacyAction(action: PrivateAreaLegacyAction): ReactNode {
  const isIcon = action.kind === "icon";
  if (!action.isEnabled || !action.href) {
    return (
      <span key={action.id} className="h-6 w-6 flex items-center justify-center rounded border border-line bg-canvas/30 text-ink-soft/30 cursor-not-allowed">
        {isIcon ? <Activity className="h-3 w-3" /> : <span className="text-[9px]">{action.label}</span>}
      </span>
    );
  }

  return (
    <Link 
      key={action.id} 
      href={action.href} 
      title={action.label}
      className="h-6 w-6 flex items-center justify-center rounded border border-brand-accent/20 bg-brand-accent/5 text-brand-accent hover:bg-brand-accent hover:text-white transition-all active-scale"
    >
       <ExternalLink className="h-3 w-3" />
    </Link>
  );
}

export default async function AreasPrivativasPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = searchParams ?? {};

  const query = pickParam(params.q) ?? "";
  const useType = pickParam(params.useType) ?? "";
  const status = pickParam(params.status) ?? "ALL";
  const m2Min = parseNumber(pickParam(params.m2Min));
  const m2Max = parseNumber(pickParam(params.m2Max));
  const page = parsePositiveInteger(pickParam(params.page), 1);
  const pageSize = Math.max(30, parsePositiveInteger(pickParam(params.pageSize), 30));

  const listing = await getPrivateAreaListingUseCase.execute({
    query, useType, status, m2Min, m2Max, page, pageSize,
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
  const currentYear = new Date().getUTCFullYear();
  const legacyOrdinaryYear = currentYear - 1;
  const nextLegacyOrdinaryYear = currentYear;
  
  const shortMonths = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthLabels = [
    ...shortMonths.map((l, i) => ({ label: `${l} ${legacyOrdinaryYear}`, key: `month_${legacyOrdinaryYear}_${i + 1}` })),
    ...shortMonths.map((l, i) => ({ label: `${l} ${nextLegacyOrdinaryYear}`, key: `month_${nextLegacyOrdinaryYear}_${i + 1}` })),
  ];

  const colWidths = [
    120, // Acciones
    130, // Ubicacion
    200, // Area / Fraccion
    140, // Jerarquia
    140, // Superficie
    140, // Superficie Orig
    110, // Indiviso
    140, // Areas Comunes
    140, // Totales
    140, // Construccion
    140, // Comunes Sub
    140, // Totales FAP
    110, // % Indiviso FAP
    140, // Indiviso Cond
    110, // Uso Suelo
    160, // Cartera Vencida
    160, // Anticipado
    160, // 2025 Anual
    160, // 2025 Mensual
    160, // 2025 Saldo
    160, // 2026 Anual
    160, // 2026 Mensual
    160, // 2026 Saldo
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black text-brand tracking-tighter uppercase">Inventario de Áreas Privativas</h1>
          <p className="text-ink-soft/50 text-[11px] font-bold uppercase tracking-tight">
            Gestión maestra de superficies, usos de suelo y estado de cartera operativa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 px-4 text-[10px] font-black uppercase">
            <Link href="/listado-seguridad"><Shield className="h-3.5 w-3.5 mr-1.5" /> Seguridad</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="h-8 px-4 text-[10px] font-black uppercase">
            <Link href="/reporte-condominio"><FileText className="h-3.5 w-3.5 mr-1.5" /> Reporte</Link>
          </Button>
          <Button variant="dark" size="sm" asChild className="h-8 px-4 text-[10px] font-black uppercase shadow-lg shadow-brand-deep/20">
            <Link href="/condominio"><Settings className="h-3.5 w-3.5 mr-1.5" /> Configuración</Link>
          </Button>
        </div>
      </div>

      {/* Comparisons / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Lotes Totales" value={vm.summary.projectTotalApoles} icon={<Layers className="h-3.5 w-3.5" />} />
        <StatCard label="M2 Privativos" value={vm.summary.projectTotalM2} icon={<MapPin className="h-3.5 w-3.5" />} />
        <StatCard label="Lotes Construidos" value={vm.summary.legacyBuiltLots} icon={<Activity className="h-3.5 w-3.5" />} />
      </div>

      {/* Advanced Filter */}
      <div className="p-3 bg-card border border-line rounded-md shadow-layered">
        <form className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end" method="get">
          <Input label="Buscar" name="q" defaultValue={vm.filters.query} placeholder="Código, nombre..." className="h-8 text-[12px]" />
          <div className="relative">
            <select name="useType" defaultValue={vm.filters.useType} className="peer h-8 w-full rounded border border-line bg-card px-2 text-[12px] font-medium outline-none appearance-none">
              <option value="">Todos los usos</option>
              {vm.facets.useTypes.map(o => <option key={o.value} value={o.value}>{o.label} ({o.count})</option>)}
            </select>
            <label className="absolute left-2 -top-1.5 px-1 bg-card text-[9px] font-black uppercase tracking-widest text-brand-accent/60">Uso Suelo</label>
          </div>
          <div className="relative">
            <select name="status" defaultValue={vm.filters.status} className="peer h-8 w-full rounded border border-line bg-card px-2 text-[12px] font-medium outline-none appearance-none">
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
            <label className="absolute left-2 -top-1.5 px-1 bg-card text-[9px] font-black uppercase tracking-widest text-brand-accent/60">Estatus</label>
          </div>
          <Input label="M2 Min" name="m2Min" type="number" step="0.01" defaultValue={vm.filters.m2Min} className="h-8 text-[12px]" />
          <Input label="M2 Max" name="m2Max" type="number" step="0.01" defaultValue={vm.filters.m2Max} className="h-8 text-[12px]" />
          <div className="relative">
             <select name="pageSize" defaultValue={vm.filters.pageSize} className="peer h-8 w-full rounded border border-line bg-card px-2 text-[12px] font-medium outline-none appearance-none">
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="80">80</option>
            </select>
            <label className="absolute left-2 -top-1.5 px-1 bg-card text-[9px] font-black uppercase tracking-widest text-brand-accent/60">Registros</label>
          </div>
          <Button type="submit" className="h-8 text-[10px] font-black uppercase gap-1.5">
            <Filter className="h-3 w-3" /> Filtrar
          </Button>
        </form>
      </div>

      {/* Main Extensive Table */}
      <div className="overflow-hidden rounded-md border border-line shadow-layered bg-card">
        <StickyHorizontalTableFrame
          header={
            <table className="table-fixed border-separate border-spacing-0" style={{ width: `${fullTableWidth}px` }}>
              <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}</colgroup>
              <thead>
                <tr className="bg-canvas text-left text-[10px] font-black uppercase tracking-widest text-brand">
                  <th className="sticky left-0 z-40 px-3 py-3 border-b border-line bg-canvas">Acciones</th>
                  <th className="px-3 py-3 border-b border-line">Ubicación</th>
                  <th className="px-3 py-3 border-b border-line">Área / Fracción</th>
                  <th className="px-3 py-3 border-b border-line">Jerarquía</th>
                  <th className="px-3 py-3 border-b border-line">M2 Actual</th>
                  <th className="px-3 py-3 border-b border-line">M2 Orig</th>
                  <th className="px-3 py-3 border-b border-line">Indiviso</th>
                  <th className="px-3 py-3 border-b border-line">M2 Comunes</th>
                  <th className="px-3 py-3 border-b border-line">M2 Totales</th>
                  <th className="px-3 py-3 border-b border-line">M2 Const</th>
                  <th className="px-3 py-3 border-b border-line">Subcomunes</th>
                  <th className="px-3 py-3 border-b border-line">Totales FAP</th>
                  <th className="px-3 py-3 border-b border-line">% Indiviso</th>
                  <th className="px-3 py-3 border-b border-line">Ind. Cond</th>
                  <th className="px-3 py-3 border-b border-line">Uso Suelo</th>
                  <th className="px-3 py-3 border-b border-line bg-brand-deep/[0.03] text-brand-deep/50">Cartera Vencida</th>
                  <th className="px-3 py-3 border-b border-line bg-brand-deep/[0.03] text-brand-deep/50">Anticipado</th>
                  <th className="px-3 py-3 border-b border-line bg-brand-mint/20">Anual {legacyOrdinaryYear}</th>
                  <th className="px-3 py-3 border-b border-line bg-brand-mint/20">Mensual {legacyOrdinaryYear}</th>
                  <th className="px-3 py-3 border-b border-line bg-brand-mint/20">Saldo {legacyOrdinaryYear}</th>
                  <th className="px-3 py-3 border-b border-line bg-brand-mint/40">Anual {nextLegacyOrdinaryYear}</th>
                  <th className="px-3 py-3 border-b border-line bg-brand-mint/40">Mensual {nextLegacyOrdinaryYear}</th>
                  <th className="px-3 py-3 border-b border-line bg-brand-mint/40">Saldo {nextLegacyOrdinaryYear}</th>
                  <th className="px-3 py-3 border-b border-line">Extra Condo</th>
                  <th className="px-3 py-3 border-b border-line">Extra Condo Saldo</th>
                  <th className="px-3 py-3 border-b border-line">Extra Com</th>
                  <th className="px-3 py-3 border-b border-line">Extra Com Saldo</th>
                  <th className="px-3 py-3 border-b border-line">STC</th>
                  <th className="px-3 py-3 border-b border-line">STC Saldo</th>
                  <th className="px-3 py-3 border-b border-line">Sanción</th>
                  <th className="px-3 py-3 border-b border-line">Sanción Saldo</th>
                  <th className="px-3 py-3 border-b border-line">Comodato</th>
                  <th className="px-3 py-3 border-b border-line">Comodato Saldo</th>
                  <th className="px-3 py-3 border-b border-line bg-gold-soft/50 text-gold">Saldo Total</th>
                  {monthLabels.map(m => <th key={m.key} className="px-3 py-3 border-b border-line font-bold opacity-50">{m.label}</th>)}
                  <th className="px-3 py-3 border-b border-line">Propietario Hist.</th>
                  <th className="px-3 py-3 border-b border-line">Prop. Legal</th>
                  <th className="px-3 py-3 border-b border-line">Dominio Actual</th>
                  <th className="px-3 py-3 border-b border-line">Dominio Pleno</th>
                  <th className="px-3 py-3 border-b border-line">Arrendatario</th>
                  <th className="px-3 py-3 border-b border-line">Contacto Admin</th>
                  <th className="px-3 py-3 border-b border-line">Contacto Oper</th>
                </tr>
              </thead>
            </table>
          }
        >
          <table className="table-fixed border-separate border-spacing-0" style={{ width: `${fullTableWidth}px` }}>
            <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: `${w}px` }} />)}</colgroup>
            <tbody className="divide-y divide-line/30 text-ink">
              {vm.rows.map(row => {
                 const actions = legacyActionsByPrivateAreaId[row.id] ?? [];
                 const hasCom = row.hasRentalLabel === "Si";
                 const empty = "$0.00";
                 const f = (k: string) => {
                   const s = row.financialCells[k as keyof typeof row.financialCells];
                   return renderFinancialCards(s?.owner ?? empty, s?.commerce ?? empty, hasCom);
                 };

                 return (
                   <tr key={row.id} className={cn("h-12 hover:bg-canvas/10 transition-colors", row.hierarchyLabel === "Hijo" && "bg-success/[0.02]")}>
                     <td className="sticky left-0 z-10 px-3 py-1.5 border-r border-line bg-card shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                       <div className="flex flex-wrap gap-1">{actions.map(renderLegacyAction)}</div>
                     </td>
                     <td className="px-3 text-[11px] font-bold text-ink-soft/70 uppercase">{row.zone}</td>
                     <td className="px-3">
                       <p className="font-bold text-brand leading-tight truncate">{row.name}</p>
                       <div className="flex gap-1.5 mt-0.5">
                         <span className="px-1 py-px rounded-[2px] bg-canvas text-[9px] font-black text-ink-soft/50 uppercase">{row.code}</span>
                         <Badge variant={row.statusTone === "active" ? "success" : "danger"} className="h-3.5 px-1">{row.statusLabel}</Badge>
                       </div>
                     </td>
                     <td className="px-3">
                       <p className="text-[11px] font-bold leading-tight">{row.hierarchyLabel}</p>
                       <p className="text-[10px] text-ink-soft/40 italic">P: {row.parentName}</p>
                     </td>
                     <td className="px-3 text-[11px] font-mono">{row.m2Updated}</td>
                     <td className="px-3 text-[11px] font-mono">{row.m2Original}</td>
                     <td className="px-3 text-[11px] font-mono">{row.indiviso}</td>
                     <td className="px-3 text-[11px] font-mono">{row.m2CommonArea}</td>
                     <td className="px-3 text-[11px] font-mono font-bold">{row.totalAreaM2}</td>
                     <td className="px-3 text-[11px] font-mono">{row.m2Construction}</td>
                     <td className="px-3 text-[11px] font-mono">{row.m2CommonAreaChildren}</td>
                     <td className="px-3 text-[11px] font-mono">{row.m2ConstructionChildren}</td>
                     <td className="px-3 text-[11px] font-mono">{row.indiviso}</td>
                     <td className="px-3 text-[11px] font-mono">{row.vccc}</td>
                     <td className="px-3"><Badge variant="outline" className="h-4 px-1 text-[10px]">{row.useTypeInitials}</Badge></td>
                     <td className="px-2">{f("arrears_2017_2024")}</td>
                     <td className="px-2">{f("advance_2024")}</td>
                     <td className="px-2">{f("ordinary_2025_annual")}</td>
                     <td className="px-2">{f("ordinary_2025_monthly")}</td>
                     <td className="px-2">{f("ordinary_2025_outstanding")}</td>
                     <td className="px-2">{f("ordinary_2026_annual")}</td>
                     <td className="px-2">{f("ordinary_2026_monthly")}</td>
                     <td className="px-2">{f("ordinary_2026_outstanding")}</td>
                     <td className="px-2">{f("extra_condo_2024_2025")}</td>
                     <td className="px-2">{f("extra_condo_2024_2025_outstanding")}</td>
                     <td className="px-2">{f("extra_commerce_2024_2025")}</td>
                     <td className="px-2">{f("extra_commerce_2024_2025_outstanding")}</td>
                     <td className="px-2">{f("stc")}</td>
                     <td className="px-2">{f("stc_outstanding")}</td>
                     <td className="px-2">{f("sancion")}</td>
                     <td className="px-2">{f("sancion_outstanding")}</td>
                     <td className="px-2">{f("comodato")}</td>
                     <td className="px-2">{f("comodato_outstanding")}</td>
                     <td className="px-2 bg-gold-soft/10">{f("total_outstanding")}</td>
                     {monthLabels.map(m => <td key={m.key} className="px-2 opacity-60 scale-90">{f(m.key)}</td>)}
                     <td className="px-3">{renderPartyContacts(row.ownerInitialHistory)}</td>
                     <td className="px-3">{renderPartyContacts(row.ownerLegal)}</td>
                     <td className="px-3">{renderPartyContacts(row.domainCurrent)}</td>
                     <td className="px-3">{renderPartyContacts(row.domainFull)}</td>
                     <td className="px-3">{renderPartyContacts(row.tenantUsers)}</td>
                     <td className="px-3">{renderPartyContacts(row.rentalAdministrativeContacts)}</td>
                     <td className="px-3">{renderPartyContacts(row.rentalOperationalContacts)}</td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        </StickyHorizontalTableFrame>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between h-10 px-1 border-t border-line/30 pt-4">
        <p className="text-[11px] font-black uppercase text-ink-soft/50 tracking-tighter">
          Página {vm.pagination.page} de {vm.pagination.totalPages} · {vm.pagination.totalRows} Unidades
        </p>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" asChild className={cn("h-8 px-4 text-[10px] font-black uppercase gap-1", !vm.pagination.hasPrev && "opacity-20 pointer-events-none")}>
             <Link href={buildHref(Math.max(1, vm.pagination.page - 1))}><ChevronLeft className="h-3.5 w-3.5" /> Anterior</Link>
           </Button>
           <Button variant="ghost" size="sm" asChild className={cn("h-8 px-4 text-[10px] font-black uppercase gap-1", !vm.pagination.hasNext && "opacity-20 pointer-events-none")}>
             <Link href={buildHref(Math.min(vm.pagination.totalPages, vm.pagination.page + 1))}>Siguiente <ChevronRight className="h-3.5 w-3.5" /></Link>
           </Button>
        </div>
      </div>
    </div>
  );
}
