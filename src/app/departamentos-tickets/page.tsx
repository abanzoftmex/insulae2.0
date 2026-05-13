import Link from "next/link";
import { Building2, Mail, Plus, Ticket, Edit2, Trash2 } from "lucide-react";

import { deleteTicketDepartmentAction } from "./actions";
import { getTicketDepartmentListingUseCase, toTicketDepartmentListingVM } from "@/modules/ticket-departments";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DepartamentosTicketsPage() {
  const submitDeleteDepartment = async (formData: FormData): Promise<void> => {
    "use server";
    await deleteTicketDepartmentAction(formData);
  };

  const listing = await getTicketDepartmentListingUseCase.execute();

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para operar este catálogo.</p>
      </div>
    );
  }

  const vm = toTicketDepartmentListingVM(listing);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Departamentos de Tickets</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Mesa de Atención</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">{vm.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25">
            <Link href="/departamentos-tickets/nuevo">
              <Plus className="h-3.5 w-3.5" />
              Nuevo departamento
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard accent="brand" label="Total Departamentos" value={vm.total} icon={<Ticket className="h-3.5 w-3.5" />} />
      </div>

        {/* ── Table card ───────────────────────────────────────── */}
        <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2">
            <Ticket className="h-4 w-4 text-white/80" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">{vm.title}</span>
          </div>

          {vm.rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-ink">No hay departamentos registrados</p>
              <p className="text-xs text-ink-soft mt-1">Crea el primer departamento para canalizar tickets.</p>
              <Link
                href="/departamentos-tickets/nuevo"
                className="mt-4 inline-flex items-center gap-2 h-8 px-4 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear primer departamento
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-canvas/60">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60">Departamento</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Correo de contacto</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Carga</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {vm.rows.map((row, index) => {
                    const workloadVariant =
                      row.workloadLevel === "high" ? "danger"
                      : row.workloadLevel === "low" ? "success"
                      : "warning";

                    return (
                      <tr
                        key={row.id}
                        className={index % 2 === 0 ? "bg-white hover:bg-brand-mint/20 transition-colors" : "bg-canvas/60 hover:bg-brand-mint/20 transition-colors"}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-mint/60 text-brand">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm text-ink">{row.name}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 border-l border-black/5">
                          <a
                            href={`mailto:${row.email}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                          >
                            <Mail className="h-4 w-4 text-ink-soft/60" />
                            {row.email}
                          </a>
                        </td>

                        <td className="px-4 py-3 border-l border-black/5">
                          <Badge variant={workloadVariant} className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
                            {row.ticketsCountLabel}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 border-l border-black/5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/departamentos-tickets/${row.id}/editar`}
                              className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors"
                              aria-label="Editar"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Link>

                            {row.canDelete ? (
                              <form action={submitDeleteDepartment}>
                                <input type="hidden" name="departmentId" value={row.id} />
                                <button
                                  type="submit"
                                  className="h-8 w-8 flex items-center justify-center rounded-full bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors"
                                  aria-label="Eliminar"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            ) : (
                              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">En uso</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}
