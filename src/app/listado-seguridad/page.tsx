import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { getPrivateAreaListingUseCase } from "@/modules/private-areas";
import {
  type PrivateAreaRowVM,
  toPrivateAreaListingVM,
} from "@/modules/private-areas/presentation/private-area-listing.vm";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { 
  Shield, 
  MapPin, 
  User, 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight,
  Mail,
  Phone,
  Layers
} from "lucide-react";

export const metadata: Metadata = {
  title: "Listado Seguridad | Insulae 2.0",
  description: "Consulta operativa de contactos, dominios y arrendatarios por unidad.",
};

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function pickParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return (Number.isNaN(parsed) || parsed <= 0) ? fallback : parsed;
}

function resolveDomainContacts(row: PrivateAreaRowVM) {
  if (row.domainFull.length > 0) return row.domainFull;
  if (row.domainCurrent.length > 0) return row.domainCurrent;
  return row.ownerLegal;
}

function resolveTenantContacts(row: PrivateAreaRowVM) {
  if (row.tenantUsers.length > 0) return row.tenantUsers;
  if (row.rentalOperationalContacts.length > 0) return row.rentalOperationalContacts;
  return row.rentalAdministrativeContacts;
}

function renderContacts(
  contacts: Array<{ name: string; email: string | null; phone: string | null }>,
  highlight = false,
): ReactNode {
  if (contacts.length === 0) return <span className="text-xs text-ink-soft/60">—</span>;
  return (
    <div className="space-y-2">
      {contacts.map((contact, index) => (
        <div
          key={index}
          className={cn(
            "p-2.5 rounded border",
            highlight
              ? "bg-lime-50 border-lime-200 shadow-sm shadow-lime-100"
              : "bg-canvas/40 border-black/8"
          )}
        >
          <p className="font-bold text-ink leading-tight text-sm uppercase">{contact.name}</p>
          <div className="flex flex-col gap-1 mt-1.5">
             {contact.email && (
               <p className="text-xs text-ink-soft flex items-center gap-1.5">
                 <Mail className={cn("h-4 w-4 shrink-0", highlight ? "text-lime-600" : "text-ink-soft/70")} /> {contact.email}
               </p>
             )}
             {contact.phone && (
               <p className="text-xs text-ink-soft flex items-center gap-1.5">
                 <Phone className={cn("h-4 w-4 shrink-0", highlight ? "text-lime-600" : "text-ink-soft/70")} /> {contact.phone}
               </p>
             )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Paginator({ page, totalPages, buildHref }: { page: number; totalPages: number; buildHref: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-3">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-brand hover:text-white hover:border-brand",
          page === 1 && "opacity-30 pointer-events-none"
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Anterior
      </Link>
      <span className="text-[11px] font-bold uppercase text-ink-soft/80 tabular-nums">
        Pág {page} / {totalPages}
      </span>
      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-brand hover:text-white hover:border-brand",
          page === totalPages && "opacity-30 pointer-events-none"
        )}
      >
        Siguiente <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default async function ListadoSeguridadPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = searchParams ?? {};

  const query = pickParam(params.palabra) ?? pickParam(params.q) ?? "";
  const page = parsePositiveInteger(pickParam(params.page), 1);
  const pageSize = 25;

  const listing = await getPrivateAreaListingUseCase.execute({
    query,
    status: "ALL",
    page,
    pageSize,
    paginateByTopLevel: true,
  });

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para construir la vista.</p>
      </div>
    );
  }

  const vm = toPrivateAreaListingVM(listing);

  const buildHref = (nextPage: number) => {
    const search = new URLSearchParams();
    if (query.trim()) search.set("q", query.trim());
    search.set("page", String(nextPage));
    return `/listado-seguridad?${search.toString()}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Filtro de Seguridad</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Vigilancia</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Consulta rápida de contactos por unidad privativa y barrio.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25">
            <Link href="/areas-privativas"><ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden /> Ver Inventario Maestro</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard accent="lime" label="Total Registros" value={vm.pagination.totalRows} icon={<Users className="h-3.5 w-3.5" />} />
        <div className="md:col-span-3">
          <Card className="p-3 shadow-layered border-transparent">
            <form method="get" className="flex gap-3">
              <div className="flex-1">
                <Input label="Buscador por Código o Nombre" name="q" defaultValue={query} placeholder="Ej. BL-01, Nombre Propietario..." className="h-9" />
              </div>
              <Button type="submit" className="h-9 px-6 text-[10px] font-bold uppercase gap-2">
                <Search className="h-4 w-4" /> Buscar
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Main Table */}
      {vm.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/70">
            {vm.pagination.totalRows} registros · página {vm.pagination.page} de {vm.pagination.totalPages}
          </p>
          <Paginator page={vm.pagination.page} totalPages={vm.pagination.totalPages} buildHref={buildHref} />
        </div>
      )}
      <Card className="overflow-hidden border-transparent shadow-layered">
        <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white">Registro de Seguridad</p>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="h-10 bg-canvas/30 border-b border-line text-[10px] font-bold uppercase tracking-widest text-ink-soft/80">
                <th className="px-4 w-45">Barrio / Ubicación</th>
                <th className="px-4">Área Privativa / Estatus</th>
                <th className="px-4 border-l border-black/10">Dominio Pleno (Legal)</th>
                <th className="px-4 border-l border-black/10">Arrendatario / Operativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/30">
              {vm.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-ink-soft/50 italic font-bold uppercase text-[11px]">
                    No se encontraron resultados
                  </td>
                </tr>
              ) : (
                vm.rows.map((row, index) => (
                  <tr key={row.id} className={cn("hover:bg-brand-mint/20 transition-colors group", index % 2 === 0 ? "bg-white" : "bg-canvas/60")}>
                    <td className="px-4 align-top py-5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-6 w-6 shrink-0 text-brand" />
                        <span className="text-base font-bold uppercase tracking-tight text-brand">{row.zone}</span>
                      </div>
                    </td>

                    <td className="px-4 align-top py-5">
                      <p className="text-base font-bold text-ink leading-tight">{row.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest bg-canvas/50">{row.code}</Badge>
                        <Badge variant={row.statusTone === "active" ? "success" : "danger"} className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">{row.businessStatusLabel}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-ink-soft/70 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 shrink-0" /> {row.hierarchyLabel}
                      </p>
                    </td>

                    <td className="px-4 align-top py-5 border-l border-black/10 bg-canvas/2">
                       <div className="flex items-center gap-2 mb-2.5">
                         <User className="h-5 w-5 text-brand/70" />
                         <span className="text-xs font-bold text-ink-soft uppercase tracking-wide">Titulares</span>
                       </div>
                       {renderContacts(resolveDomainContacts(row), true)}
                    </td>

                    <td className="px-4 align-top py-5 border-l border-black/10">
                       <div className="flex items-center gap-2 mb-2.5">
                         <Shield className="h-5 w-5 text-brand/70" />
                         <span className="text-xs font-bold text-ink-soft uppercase tracking-wide">Ocupantes</span>
                       </div>
                       {renderContacts(resolveTenantContacts(row))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-between items-center py-2 px-1">
         <p className="text-[11px] font-bold text-ink-soft/70 uppercase tracking-widest">
           Resguardo de información · Uso restringido a seguridad
         </p>
         <Paginator page={vm.pagination.page} totalPages={vm.pagination.totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
