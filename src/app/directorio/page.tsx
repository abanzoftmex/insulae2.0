import type { Metadata } from "next";
import Link from "next/link";
import { getDirectoryUseCase } from "@/modules/directory";
import { toDirectoryVM } from "@/modules/directory/presentation/directory.vm";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-black text-brand tracking-tighter uppercase">Directorio de Personas</h1>
          <p className="text-ink-soft/50 text-[11px] font-bold uppercase tracking-tight">
            Gestión centralizada de residentes, propietarios y personal operativo.
          </p>
        </div>
        <Paginator page={vm.pagination.page} totalPages={vm.pagination.totalPages} buildHref={buildHref} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Total Personas" value={vm.totalUsers} icon={<Users className="h-3.5 w-3.5" />} />
        <div className="md:col-span-3">
          <Card className="p-3 shadow-layered border-transparent">
            <form method="get" className="flex gap-3">
              <div className="flex-1">
                <Input label="Buscador Universal" name="q" defaultValue={query} placeholder="Nombre, correo, teléfono, rol o unidad..." className="h-9" />
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
                <th className="px-4">Nombre / Razón Social</th>
                <th className="px-4">Vínculo / Unidad</th>
                <th className="px-4">Contacto</th>
                <th className="px-4">Configuración</th>
                <th className="px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/30">
              {vm.people.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-ink-soft/30 italic font-bold uppercase text-[11px]">
                    Sin registros que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                vm.people.map((person) => (
                  <tr key={person.id} className="h-14 hover:bg-canvas/10 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-brand-mint/30 flex items-center justify-center text-brand font-black text-[10px]">
                           {person.legalNameLabel.slice(0, 2).toUpperCase()}
                         </div>
                         <div className="min-w-0">
                           <p className="text-[13px] font-black text-ink leading-tight truncate">{person.legalNameLabel}</p>
                           <p className="text-[11px] font-semibold text-ink-soft/50 mt-0.5">{person.primaryRoleLabel}</p>
                         </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                       <div className="flex items-center gap-1.5">
                         <Briefcase className="h-3 w-3 text-brand/30" />
                         <span className="text-[11px] font-bold text-ink-soft uppercase tracking-tight">{person.commerceLabel || "Individual"}</span>
                       </div>
                    </td>

                    <td className="px-4 py-3">
                       <div className="flex flex-col gap-0.5">
                         {person.email && (
                           <div className="flex items-center gap-1.5 text-ink-soft/60">
                             <Mail className="h-2.5 w-2.5" />
                             <span className="text-[10px] font-medium truncate max-w-[150px]">{person.email}</span>
                           </div>
                         )}
                         {person.phone && (
                           <div className="flex items-center gap-1.5 text-ink-soft/60">
                             <Phone className="h-2.5 w-2.5" />
                             <span className="text-[10px] font-medium">{person.phone}</span>
                           </div>
                         )}
                       </div>
                    </td>

                    <td className="px-4 py-3">
                       <div className="flex items-center gap-2">
                         {person.requiresInvoiceLabel === "Si" ? (
                           <Badge variant="brand" className="h-4 px-1.5 text-[10px]">Factura</Badge>
                         ) : (
                           <span className="text-[10px] text-ink-soft/30">Sin Factura</span>
                         )}
                       </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                       <Button variant="ghost" size="sm" asChild className="h-7 px-3 text-[10px] font-black uppercase gap-1 hover:bg-brand hover:text-white">
                         <Link href={buildEditHref(person.reference)}>
                           Perfil <ArrowRight className="h-3 w-3" />
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
         <p className="text-[11px] font-bold text-ink-soft/40 uppercase tracking-widest">
           Base de datos consolidada · {vm.totalUsers} Personas en sistema
         </p>
         <Paginator page={vm.pagination.page} totalPages={vm.pagination.totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
