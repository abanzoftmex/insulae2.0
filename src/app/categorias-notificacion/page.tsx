import Link from "next/link";
import { Plus, Tag } from "lucide-react";

import { deleteNotificationCategoryAction } from "./actions";

import {
  getNotificationCategoryListingUseCase,
  toNotificationCategoryListingVM,
} from "@/modules/notification-categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { StatCard } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";

export default async function CategoriasNotificacionPage() {
  const submitDeleteCategory = async (formData: FormData): Promise<void> => {
    "use server";
    await deleteNotificationCategoryAction(formData);
  };

  const listing = await getNotificationCategoryListingUseCase.execute();

  if (!listing) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
          <div className="flex items-start gap-3">
            <PageBackBadge className="mt-1.5 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Categorías de Notificación</h1>
              <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Catálogo Operativo</Badge>
            </div>
          </div>
        </div>
        <p className="text-sm text-ink-soft">Aún no hay un condominio activo para operar este catálogo.</p>
      </div>
    );
  }

  const vm = toNotificationCategoryListingVM(listing);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">{vm.title}</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Catálogo Operativo</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">{vm.subtitle}</p>
          </div>
        </div>
        <Button size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25 shrink-0">
          <Link href="/categorias-notificacion/nuevo">
            <Plus className="h-3.5 w-3.5" /> Nueva categoría
          </Link>
        </Button>
      </div>

      {/* ── Stat ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard accent="brand" label="Total categorías" value={vm.total} icon={<Tag className="h-3.5 w-3.5" />} />
      </div>

      {/* ── Table card ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2">
          <Tag className="h-4 w-4 text-white/80" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">Categorías registradas</span>
        </div>

        {vm.rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-ink">No hay categorías registradas</p>
            <p className="mt-1 text-xs text-ink-soft">Crea la primera para clasificar notificaciones.</p>
            <Button size="sm" asChild className="mt-4 h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full">
              <Link href="/categorias-notificacion/nuevo"><Plus className="h-3.5 w-3.5" /> Nueva categoría</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-canvas/60">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60">Categoría</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Color</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Uso</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {vm.rows.map((row, i) => (
                  <tr key={row.id} className={`${i % 2 === 0 ? "bg-white" : "bg-canvas/60"} hover:bg-brand-mint/20 transition-colors`}>
                    <td className="px-4 py-3 font-semibold text-ink">{row.name}</td>
                    <td className="px-4 py-3 border-l border-black/5">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className="h-5 w-5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: row.color }}
                          aria-hidden
                        />
                        <span className="text-xs font-mono text-ink-soft">{row.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-l border-black/5 text-xs text-ink-soft">{row.notificationsCountLabel}</td>
                    <td className="px-4 py-3 border-l border-black/5">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          href={`/categorias-notificacion/${row.id}/editar`}
                          className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Link>
                        {row.canDelete ? (
                          <form action={submitDeleteCategory}>
                            <input type="hidden" name="categoryId" value={row.id} />
                            <button
                              type="submit"
                              className="h-8 w-8 flex items-center justify-center rounded-full bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors"
                              title="Eliminar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </form>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">En uso</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
