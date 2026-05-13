import type { Metadata } from "next";
import Link from "next/link";
import { getDirectoryUseCase } from "@/modules/directory";
import { toDirectoryVM } from "@/modules/directory/presentation/directory.vm";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/cn";
import { 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Mail,
  Phone,
  ArrowRight,
  Briefcase
} from "lucide-react";

export const metadata: Metadata = {
  title: "Directorio | Insulae 2.0",
  description: "Directorio operativo de personas, roles y asignaciones del condominio.",
};

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function pickParam(value: SearchParamValue): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return (Number.isNaN(parsed) || parsed <= 0) ? fallback : parsed;
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

export default async function DirectorioPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = searchParams ?? {};
  const query = pickParam(params.q).trim();
  const page = parsePositiveInteger(pickParam(params.page), 1);
  const pageSize = 50;

  const directory = await getDirectoryUseCase.execute({ query, page, pageSize });
  const vm = directory ? toDirectoryVM(directory) : null;

  if (!vm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para consultar el directorio.</p>
      </div>
    );
  }

  const buildHref = (nextPage: number): string => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    search.set("page", String(nextPage));
    return `/directorio?${search.toString()}`;
  };

  const buildEditHref = (reference: string): string => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    search.set("page", String(vm.pagination.page));
    return `/directorio/formulario/${encodeURIComponent(reference)}?${search.toString()}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Directorio de Personas</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Gestión de Personas</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Gestión centralizada de residentes, propietarios y personal operativo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard accent="lime" label="Total Personas" value={vm.totalUsers} icon={<Users className="h-3.5 w-3.5" />} />
        <div className="md:col-span-3">
          <Card className="p-3 shadow-layered border-transparent">
            <form method="get" className="flex gap-3">
              <div className="flex-1">
                <Input label="Buscador Universal" name="q" defaultValue={query} placeholder="Nombre, correo, teléfono, rol o unidad..." className="h-9" />
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
            {vm.totalUsers} personas · página {vm.pagination.page} de {vm.pagination.totalPages}
          </p>
          <Paginator page={vm.pagination.page} totalPages={vm.pagination.totalPages} buildHref={buildHref} />
        </div>
      )}
      <Card className="overflow-hidden border-transparent shadow-layered">
        <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white">Registro de Personas</p>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="h-10 bg-canvas/30 border-b border-line text-[10px] font-bold uppercase tracking-widest text-ink-soft/80">
                <th className="px-4">Nombre / Razón Social</th>
                <th className="px-4">Vínculo / Unidad</th>
                <th className="px-4">Contacto</th>
                <th className="px-4">Configuración</th>
                <th className="px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {vm.people.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-ink-soft/50 italic font-bold uppercase text-[11px]">
                    Sin registros que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                vm.people.map((person, index) => (
                  <tr key={person.id} className={cn("hover:bg-brand-mint/20 transition-colors group", index % 2 === 0 ? "bg-white" : "bg-canvas/60")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-brand-mint/30 flex items-center justify-center text-brand font-bold text-[10px]">
                           {person.legalNameLabel.slice(0, 2).toUpperCase()}
                         </div>
                         <div className="min-w-0">
                           <p className="text-base font-bold text-ink leading-tight">{person.legalNameLabel}</p>
                           <p className="text-xs font-semibold text-ink-soft mt-0.5">{person.primaryRoleLabel}</p>
                         </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                       <div className="flex items-center gap-2">
                         <Briefcase className="h-4 w-4 text-ink-soft/60" />
                         <span className="text-xs font-bold text-ink-soft">{person.commerceLabel || "Individual"}</span>
                       </div>
                    </td>

                    <td className="px-4 py-3">
                       <div className="flex flex-col gap-1">
                         {person.email && (
                           <div className="flex items-center gap-2 text-ink-soft">
                             <Mail className="h-4 w-4 shrink-0 text-ink-soft/60" />
                             <span className="text-xs font-medium">{person.email}</span>
                           </div>
                         )}
                         {person.phone && (
                           <div className="flex items-center gap-2 text-ink-soft">
                             <Phone className="h-4 w-4 shrink-0 text-ink-soft/60" />
                             <span className="text-xs font-medium">{person.phone}</span>
                           </div>
                         )}
                       </div>
                    </td>

                    <td className="px-4 py-3">
                       <div className="flex items-center gap-2">
                         {person.requiresInvoiceLabel === "Si" ? (
                           <Badge variant="brand" className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest">Factura</Badge>
                         ) : (
                           <span className="text-xs font-medium text-ink-soft/60">Sin Factura</span>
                         )}
                       </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                       <Button variant="dark" size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase shadow-md shadow-brand-deep/25">
                         <Link href={buildEditHref(person.reference)}>
                           Perfil <ArrowRight className="h-3.5 w-3.5" />
                         </Link>
                       </Button>
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
           Base de datos consolidada · {vm.totalUsers} Personas en sistema
         </p>
         <Paginator page={vm.pagination.page} totalPages={vm.pagination.totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
