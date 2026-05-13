import Link from "next/link";
import { Bell, FileText, Image, Edit2, Plus, Trash2 } from "lucide-react";

import { deleteNotificationAction } from "./actions";
import { getNotificationListingUseCase, toNotificationListingVM } from "@/modules/notifications";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const TYPE_VARIANT: Record<string, "brand" | "warning" | "success"> = {
  Propietarios: "brand",
  Comercios: "warning",
  Ambos: "success",
};

export default async function NotificacionesPage() {
  const submitDeleteNotification = async (formData: FormData): Promise<void> => {
    "use server";
    await deleteNotificationAction(formData);
  };

  const listing = await getNotificationListingUseCase.execute();

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró un condominio para operar notificaciones.</p>
      </div>
    );
  }

  const vm = toNotificationListingVM(listing);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Notificaciones</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Comunicación Operativa</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">{vm.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" asChild className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full shadow-md shadow-brand-deep/25">
            <Link href="/notificaciones/nuevo">
              <Plus className="h-3.5 w-3.5" />
              Nueva notificación
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard accent="brand" label="Total Notificaciones" value={vm.total} icon={<Bell className="h-3.5 w-3.5" />} />
      </div>

      {/* ── Table card ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-card border border-line/40 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2">
          <Bell className="h-4 w-4 text-white/80" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">{vm.title}</span>
        </div>

        {vm.rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-ink">No hay notificaciones registradas</p>
            <p className="text-xs text-ink-soft mt-1">Crea la primera notificación para iniciar la comunicación del condominio.</p>
            <Link
              href="/notificaciones/nuevo"
              className="mt-4 inline-flex items-center gap-2 h-8 px-4 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest"
            >
              <Plus className="h-3.5 w-3.5" />
              Crear primera notificación
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-canvas/60">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60">Título</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Tipo</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Categoría</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Publicación</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Vigencia</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Adjuntos</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-ink-soft/60 border-l border-black/5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {vm.rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={index % 2 === 0 ? "bg-white hover:bg-brand-mint/20 transition-colors" : "bg-canvas/60 hover:bg-brand-mint/20 transition-colors"}
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-sm text-ink leading-tight">{row.title}</p>
                      <p className="text-xs text-ink-soft mt-0.5">{row.messagePreview}</p>
                    </td>

                    <td className="px-4 py-3 border-l border-black/5">
                      <Badge
                        variant={TYPE_VARIANT[row.typeLabel] ?? "outline"}
                        className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest"
                      >
                        {row.typeLabel}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 border-l border-black/5">
                      <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
                        {row.categoryLabel}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 border-l border-black/5">
                      <span className="text-xs text-ink-soft">{row.sentAtLabel}</span>
                    </td>

                    <td className="px-4 py-3 border-l border-black/5">
                      <span className="text-xs text-ink-soft">{row.validUntilLabel}</span>
                    </td>

                    <td className="px-4 py-3 border-l border-black/5">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={row.hasImageAttachment ? "success" : "outline"}
                          className="rounded-full px-2 py-1 text-[9px] font-bold tracking-widest gap-1 inline-flex items-center"
                        >
                          <Image className="h-3 w-3" />
                          {row.hasImageAttachment ? "Imagen" : "Sin imagen"}
                        </Badge>
                        {row.hasPdfAttachment && row.pdfUrl ? (
                          <a
                            href={row.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand/10 px-2 py-1 text-[9px] font-bold tracking-widest text-brand hover:bg-brand/20 transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            Ver PDF
                          </a>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-2 py-1 text-[9px] font-bold tracking-widest gap-1 inline-flex items-center">
                            <FileText className="h-3 w-3" />
                            Sin PDF
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 border-l border-black/5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/notificaciones/${row.id}/editar`}
                          className="h-8 w-8 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-800 hover:bg-cyan-200 transition-colors"
                          aria-label="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <form action={submitDeleteNotification}>
                          <input type="hidden" name="notificationId" value={row.id} />
                          <button
                            type="submit"
                            className="h-8 w-8 flex items-center justify-center rounded-full bg-danger/15 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
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
