import { getAnnouncementByIdUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { AnnouncementDetailsActions } from "../components/announcement-details-actions";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { cookies } from "next/headers";
import { getUserPermissions } from "@/shared/application/auth/permissions";
import { Card } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Users,
  MessageSquare,
  Award,
  BookOpen,
  UserCheck
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AnnouncementDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Read session to verify if Admin or Resident
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get("insulae_session")?.value;
  const session = sessionStr ? JSON.parse(sessionStr) : null;
  const permissions = await getUserPermissions();
  const isAdmin = session?.role === "ADMIN";
  const isAdmin_detail = isAdmin
    || !!permissions["Convocatorias"]?.canCreate
    || !!permissions["convocatorias"]?.canCreate
    || !!permissions["Gobernanza"]?.canCreate;

  // 1. Fetch Convocatoria Details
  const announcement = await getAnnouncementByIdUseCase.execute(id);
  if (!announcement) notFound();

  const activeDateId = announcement.dates[0]?.id;
  const statusName = announcement.status.name;

  // 2. Fetch all directories & positions catalogs for friendly display name mappings
  const formData = await getAnnouncementFormDataUseCase.execute();
  
  // Maps for efficient ID to Name resolution
  const userMap = new Map(formData.directory.map(u => [u.id, u.name]));
  
  const allPositions = await prisma.condominiumStructurePosition.findMany({
    select: { id: true, name: true }
  });
  const positionMap = new Map(allPositions.map(p => [p.id, p.name]));

  // Reconcile names
  const conveningName = announcement.conveningPersonId ? userMap.get(announcement.conveningPersonId) : undefined;
  const moderatorName = announcement.moderatorPersonId ? userMap.get(announcement.moderatorPersonId) : undefined;

  const sectionHeaderCls = "px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex items-center gap-2";
  const sectionTitleCls = "text-[10px] font-bold uppercase tracking-widest text-white";
  const sectionBodyCls = "p-5";
  const sectionCls = "overflow-hidden rounded-card border border-line/40 bg-white shadow-sm";

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="brand">{announcement.type.name}</Badge>
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                {announcement.subtype.name}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase leading-none">
              {announcement.name}
            </h1>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Detalle de asamblea y agenda del condominio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {announcement.pdfUrl && (
            <a
              href={announcement.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-canvas border border-line text-brand text-[10px] font-bold uppercase tracking-widest hover:bg-brand hover:text-white hover:border-brand transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Ver PDF
            </a>
          )}
          <AnnouncementDetailsActions
            id={announcement.id}
            name={announcement.name}
            pdfUrl={announcement.pdfUrl}
            isAdmin={isAdmin_detail}
            activeDateId={activeDateId}
            statusName={statusName}
            isReunion={
              announcement.type.name.toLowerCase().includes("reunion") ||
              announcement.subtype.name.toLowerCase().includes("reunion")
            }
          />
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Información General */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>
              <Award className="h-4 w-4 text-white/90" />
              <h2 className={sectionTitleCls}>Información General</h2>
            </div>
            <div className={`${sectionBodyCls} grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4`}>
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft/80">Convoca</span>
                <p className="text-sm font-bold text-ink">{conveningName || "No especificado"}</p>
                {announcement.conveningPosition && (
                  <p className="text-[10px] font-semibold text-ink-soft uppercase">{announcement.conveningPosition}</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft/80">Moderador</span>
                <p className="text-sm font-bold text-ink">{moderatorName || "No especificado"}</p>
                {announcement.moderatorPosition && (
                  <p className="text-[10px] font-semibold text-ink-soft uppercase">{announcement.moderatorPosition}</p>
                )}
              </div>

              <div className="space-y-1 md:col-span-2 border-t border-line/60 pt-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft/80">Estatus</span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-sm bg-canvas border border-line text-ink-soft">
                    {announcement.status.name}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Llamados */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>
              <Calendar className="h-4 w-4 text-white/90" />
              <h2 className={sectionTitleCls}>Llamados</h2>
            </div>
            <div className={`${sectionBodyCls} space-y-4`}>
              {announcement.dates.length > 0 ? (
                announcement.dates.map((call, idx) => (
                  <div key={call.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-card bg-canvas border border-line last:mb-0">
                    <div className="flex items-center gap-4">
                      {/* Date circular badge */}
                      <div className="bg-brand text-white text-center rounded-2xl min-w-14 py-2 shrink-0">
                        <div className="text-[9px] uppercase font-bold opacity-80 leading-none">
                          {format(new Date(call.date), "MMM", { locale: es })}
                        </div>
                        <div className="text-lg font-bold leading-tight mt-0.5">
                          {format(new Date(call.date), "dd")}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-brand uppercase tracking-tight">{call.callType}</div>
                        <p className="text-xs font-bold text-ink">
                          {format(new Date(call.date), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs">
                      {call.time && (
                        <div className="flex items-center gap-1.5 text-ink-soft">
                          <Clock className="h-3.5 w-3.5 text-brand-deep/80 shrink-0" />
                          <span>{call.time} hrs</span>
                        </div>
                      )}
                      {call.location && (
                        <div className="flex items-center gap-1.5 text-ink-soft">
                          <MapPin className="h-3.5 w-3.5 text-brand-deep/80 shrink-0" />
                          <span className="truncate max-w-xs">{call.location}</span>
                        </div>
                      )}
                      {call.status === "Realizada" && (
                        <div className="flex items-center gap-1.5 text-success font-bold">
                          <UserCheck className="h-3.5 w-3.5 text-success shrink-0" />
                          <span>
                            {call.checkedPositions
                              ? call.checkedPositions.split(",").filter(Boolean).length
                              : 0}{" "}
                            Presentes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-ink-soft text-[11px]">No se han registrado llamados de fechas.</p>
              )}
            </div>
          </section>

          {/* Convocados */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>
              <Users className="h-4 w-4 text-white/90" />
              <h2 className={sectionTitleCls}>Convocados del Organigrama</h2>
            </div>
            <div className={sectionBodyCls}>
              {announcement.invitedPositions && announcement.invitedPositions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {announcement.invitedPositions.map(pos => {
                    const posName = positionMap.get(pos.positionId) || pos.positionId;
                    return (
                      <div key={pos.id} className="flex items-center gap-2.5 p-3 rounded-card bg-canvas border border-line">
                        <div className="w-5 h-5 rounded-full bg-brand-mint/20 text-brand flex items-center justify-center shrink-0">
                          <UserCheck className="w-3 h-3" />
                        </div>
                        <span className="text-[11px] font-bold text-ink leading-tight">{posName}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-ink-soft text-[11px]">No se convocaron puestos específicos de la estructura.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column (1/3 width on large screens) */}
        <div className="space-y-6">
          
          {/* Orden del Día */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>
              <BookOpen className="h-4 w-4 text-white/90" />
              <h2 className={sectionTitleCls}>Orden del Día</h2>
            </div>
            <div className={`${sectionBodyCls} space-y-4`}>
              {announcement.topics.length > 0 ? (
                announcement.topics.map((topic, idx) => {
                  const presenterName = topic.presenterId ? userMap.get(topic.presenterId) : undefined;
                  
                  // Parse votes count
                  let favorCount = 0;
                  let againstCount = 0;
                  let abstainCount = 0;
                  if (topic.votesJson) {
                    try {
                      const votes = JSON.parse(topic.votesJson);
                      Object.values(votes).forEach(vt => {
                        if (vt === "FAVOR") favorCount++;
                        else if (vt === "AGAINST") againstCount++;
                        else if (vt === "ABSTAIN") abstainCount++;
                      });
                    } catch (e) {}
                  }

                  return (
                    <div key={topic.id} className="p-4 rounded-card border border-line bg-canvas space-y-3 relative">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-sm bg-brand text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                          Tema {idx + 1}
                        </span>
                      </div>
                      
                      <p className="text-xs font-bold text-ink leading-relaxed pr-6">{topic.title}</p>
                      
                      <div className="grid grid-cols-1 gap-2 pt-2 border-t border-line/60 text-[10px]">
                        {presenterName && (
                          <div className="text-ink-soft">
                            Presentador: <span className="font-bold text-brand">{presenterName}</span>
                          </div>
                        )}
                        {topic.durationMinutes && (
                          <div className="text-ink-soft">
                            Duración estimada: <span className="font-bold text-brand">{topic.durationMinutes} min</span>
                          </div>
                        )}
                        {topic.actionType && topic.actionType !== "NONE" && (
                          <div className="mt-1">
                            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-brand text-white">
                              {topic.actionType === "VOTE" ? "Votación" : "Confirmación"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Render conclusions / comments if set */}
                      {topic.conclusions && (
                        <div className="mt-2.5 p-3 rounded bg-white border border-brand/20 text-xs">
                          <span className="text-[9px] font-bold text-brand uppercase tracking-wider block mb-1">
                            Acuerdos / Conclusiones
                          </span>
                          <p className="text-ink-soft italic leading-relaxed">"{topic.conclusions}"</p>
                        </div>
                      )}

                      {/* Render voting results breakdown if votes are cast */}
                      {topic.actionType && topic.actionType !== "NONE" && (favorCount > 0 || againstCount > 0 || abstainCount > 0) && (
                        <div className="mt-2.5 pt-2.5 border-t border-line/50 space-y-2">
                          <span className="text-[9px] font-bold text-ink-soft uppercase tracking-wider block">
                            Resultados de la Votación
                          </span>
                          
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                            {topic.actionType === "VOTE" ? (
                              <>
                                <div className="bg-success/5 border border-success/10 p-1.5 rounded">
                                  <span className="text-success font-bold block">A Favor</span>
                                  <span className="text-xs font-extrabold text-success mt-0.5 block">{favorCount}</span>
                                </div>
                                <div className="bg-amber-500/5 border border-amber-500/10 p-1.5 rounded">
                                  <span className="text-amber-500 font-bold block">Abstención</span>
                                  <span className="text-xs font-extrabold text-amber-500 mt-0.5 block">{abstainCount}</span>
                                </div>
                                <div className="bg-danger/5 border border-danger/10 p-1.5 rounded">
                                  <span className="text-danger font-bold block">En Contra</span>
                                  <span className="text-xs font-extrabold text-danger mt-0.5 block">{againstCount}</span>
                                </div>
                              </>
                            ) : (
                              <div className="bg-success/5 border border-success/10 p-1.5 rounded col-span-3">
                                <span className="text-success font-bold block">Confirmaciones</span>
                                <span className="text-xs font-extrabold text-success mt-0.5 block">{favorCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-ink-soft text-[11px]">No se han registrado temas para el orden del día.</p>
              )}
            </div>
          </section>

          {/* Invitados Especiales */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>
              <Users className="h-4 w-4 text-white/90" />
              <h2 className={sectionTitleCls}>Invitados Especiales</h2>
            </div>
            <div className={`${sectionBodyCls} space-y-3`}>
              {announcement.specialGuests && announcement.specialGuests.length > 0 ? (
                announcement.specialGuests.map(guest => (
                  <div key={guest.id} className="p-3 rounded-card bg-canvas border border-line space-y-1">
                    <p className="text-[11px] font-bold text-ink leading-tight">{guest.name}</p>
                    {guest.email && (
                      <p className="text-[9px] font-medium text-ink-soft truncate">{guest.email}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-ink-soft text-[11px]">No hay invitados externos registrados.</p>
              )}
            </div>
          </section>

          {/* Comentarios */}
          {announcement.comments && (
            <section className={sectionCls}>
              <div className={sectionHeaderCls}>
                <MessageSquare className="h-4 w-4 text-white/90" />
                <h2 className={sectionTitleCls}>Observaciones</h2>
              </div>
              <div className={sectionBodyCls}>
                <p className="text-xs text-ink-soft/90 leading-relaxed italic">
                  "{announcement.comments}"
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
