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
): ReactNode {
  if (contacts.length === 0) return <span className="text-ink-soft/20">—</span>;
  return (
    <div className="space-y-1.5">
      {contacts.map((contact, index) => (
        <div key={index} className="p-2 rounded bg-canvas/40 border border-line/30">
          <p className="font-bold text-ink leading-tight text-[11px] uppercase">{contact.name}</p>
          <div className="flex flex-col gap-0.5 mt-1">
             {contact.email && (
               <p className="text-[10px] text-ink-soft/60 flex items-center gap-1 truncate">
                 <Mail className="h-2 w-2" /> {contact.email}
               </p>
             )}
             {contact.phone && (
               <p className="text-[10px] text-ink-soft/60 flex items-center gap-1">
                 <Phone className="h-2 w-2" /> {contact.phone}
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
    <div className="flex items-center gap-1.5 h-8">
      <Link href={buildHref(Math.max(1, page - 1))} className={cn("p-1 rounded hover:bg-canvas transition-colors", page === 1 && "opacity-20 pointer-events-none")}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="text-[11px] font-black uppercase text-ink-soft/60">Pág {page} de {totalPages}</span>
      <Link href={buildHref(Math.min(totalPages, page + 1))} className={cn("p-1 rounded hover:bg-canvas transition-colors", page === totalPages && "opacity-20 pointer-events-none")}>
        <ChevronRight className="h-4 w-4" />
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-brand tracking-tighter uppercase">Filtro de Seguridad</h1>
            <Badge variant="brand">Vigilancia</Badge>
          </div>
          <p className="text-ink-soft/50 text-[11px] font-bold uppercase tracking-tight">
            Consulta rápida de contactos por unidad privativa y barrio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Paginator page={vm.pagination.page} totalPages={vm.pagination.totalPages} buildHref={buildHref} />
          <Button variant="outline" size="sm" asChild className="h-8 px-4 text-[10px] font-black uppercase ml-2">
            <Link href="/areas-privativas">Ver Inventario Maestro <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Total Registros" value={vm.pagination.totalRows} icon={<Users className="h-3.5 w-3.5" />} />
        <div className="md:col-span-3">
          <Card className="p-3 shadow-layered border-transparent">
            <form method="get" className="flex gap-3">
              <div className="flex-1">
                <Input label="Buscador por Código o Nombre" name="q" defaultValue={query} placeholder="Ej. BL-01, Nombre Propietario..." className="h-9" />
              </div>
              <Button type="submit" className="h-9 px-6 text-[10px] font-black uppercase gap-2">
                <Search className="h-4 w-4" /> Buscar
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden border-transparent shadow-layered">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-10 bg-canvas/30 border-b border-line text-[10px] font-black uppercase tracking-widest text-ink-soft/60">
                <th className="px-4 w-[180px]">Barrio / Ubicación</th>
                <th className="px-4">Área Privativa / Estatus</th>
                <th className="px-4">Dominio Pleno (Legal)</th>
                <th className="px-4">Arrendatario / Operativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/30">
              {vm.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-ink-soft/30 italic font-bold uppercase text-[11px]">
                    No se encontraron resultados
                  </td>
                </tr>
              ) : (
                vm.rows.map((row) => (
                  <tr key={row.id} className="h-14 hover:bg-canvas/10 transition-colors group">
                    <td className="px-4 align-top py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-3 w-3 text-brand/30" />
                        <span className="text-[11px] font-black uppercase tracking-tight text-brand">{row.zone}</span>
                      </div>
                    </td>

                    <td className="px-4 align-top py-4">
                      <p className="text-[13px] font-black text-ink leading-tight">{row.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-canvas/50">{row.code}</Badge>
                        <Badge variant={row.statusTone === "active" ? "success" : "danger"} className="h-4 px-1 text-[9px]">{row.businessStatusLabel}</Badge>
                      </div>
                      <p className="mt-1.5 text-[11px] text-ink-soft/40 flex items-center gap-1">
                        <Layers className="h-2.5 w-2.5 opacity-50" /> {row.hierarchyLabel}
                      </p>
                    </td>

                    <td className="px-4 align-top py-4 border-l border-line/30 bg-canvas/[0.02]">
                       <div className="flex items-center gap-1.5 mb-2">
                         <User className="h-3 w-3 text-brand/20" />
                         <span className="text-[10px] font-semibold text-ink-soft/50">Titulares</span>
                       </div>
                       {renderContacts(resolveDomainContacts(row))}
                    </td>

                    <td className="px-4 align-top py-4 border-l border-line/30">
                       <div className="flex items-center gap-1.5 mb-2">
                         <Shield className="h-3 w-3 text-brand/20" />
                         <span className="text-[10px] font-semibold text-ink-soft/50">Ocupantes</span>
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
         <p className="text-[11px] font-bold text-ink-soft/40 uppercase tracking-widest">
           Resguardo de información · Uso restringido a seguridad
         </p>
         <Paginator page={vm.pagination.page} totalPages={vm.pagination.totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
