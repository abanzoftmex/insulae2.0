import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getAnnouncementByIdUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Play, Clock, MapPin } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AsambleaLauncherPage({ params }: PageProps) {
  await requirePageAccess(MODULES.CONVOCATORIAS);

  const { id } = await params;

  const announcement = await getAnnouncementByIdUseCase.execute(id);
  if (!announcement) notFound();

  // If there is only one date called session, bypass select screen and launch immediately
  if (announcement.dates.length === 1) {
    redirect(`/gobernanza/convocatorias/${id}/asamblea/${announcement.dates[0].id}`);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start gap-3 pb-5 border-b border-brand">
        <PageBackBadge className="mt-1.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase leading-none">
            Seleccionar llamado
          </h1>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
            {announcement.name}
          </Badge>
          <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
            Seleccione cuál fecha de convocatoria desea iniciar para el pase de lista y votación
          </p>
        </div>
      </div>

      {/* Date list cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcement.dates.map((date) => (
          <div
            key={date.id}
            className="overflow-hidden rounded-card border border-line bg-card shadow-sm flex flex-col relative group hover:shadow-md transition-shadow"
          >
            <div className="h-1 bg-brand w-full" />
            
            <div className="p-5 flex-1 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-brand text-white text-center rounded-2xl min-w-12 py-1.5 shrink-0">
                    <div className="text-[8px] uppercase font-bold opacity-80 leading-none">
                      {format(new Date(date.date), "MMM", { locale: es })}
                    </div>
                    <div className="text-base font-bold leading-tight mt-0.5">
                      {format(new Date(date.date), "dd")}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-brand uppercase tracking-wider">
                      {date.callType}
                    </div>
                    <p className="text-xs font-bold text-ink">
                      {format(new Date(date.date), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                  </div>
                </div>
                
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-canvas border border-line text-ink-soft">
                  {date.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-ink-soft/90 pt-2 border-t border-line/50">
                {date.time && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand shrink-0" />
                    <span>Hora: {date.time} hrs</span>
                  </div>
                )}
                {date.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                    <span className="truncate">{date.location}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4">
                <Link
                  href={`/gobernanza/convocatorias/${id}/asamblea/${date.id}`}
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors"
                >
                  <Play className="h-3 w-3 fill-current" />
                  Iniciar pase de lista
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
