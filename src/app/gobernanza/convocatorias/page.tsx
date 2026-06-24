import { getAnnouncementsUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { AnnouncementCard } from "./components/announcement-card";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { getCurrentSession } from "@/app/actions/auth";
import { prisma } from "@/shared/infrastructure/db/prisma";

export default async function AnnouncementsPage() {
  const session = await getCurrentSession();
  if (!session) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-card border border-line shadow-layered">
          <p className="text-ink-soft text-[11px]">Inicie sesión para ver las convocatorias.</p>
        </div>
      </div>
    );
  }

  const isAdmin = session.role === "ADMIN";
  const rawAnnouncements = await getAnnouncementsUseCase.execute();

  let announcements = rawAnnouncements;
  if (!isAdmin) {
    const userAssignments = await prisma.condominiumStructurePositionAssignment.findMany({
      where: { userId: session.userId, isActive: true },
      select: { positionId: true }
    });
    const userPositionIds = userAssignments.map(ua => ua.positionId);
    const userEmail = session.email ? session.email.toLowerCase() : "";

    announcements = rawAnnouncements.filter(ann => {
      const isPositionInvited = (ann.invitedPositions || []).some((ip: any) => 
        userPositionIds.includes(ip.positionId)
      );
      const isSpecialGuest = (ann.specialGuests || []).some((sg: any) => 
        sg.email && sg.email.toLowerCase() === userEmail
      );
      return isPositionInvited || isSpecialGuest;
    });
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Convocatorias</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Gobernanza</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              Asambleas y orden del día del condominio.
            </p>
          </div>
        </div>

        {isAdmin && (
          <Link
            href="/gobernanza/convocatorias/nuevo"
            className="flex items-center gap-2 h-8 px-4 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors self-start md:self-auto shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva convocatoria
          </Link>
        )}
      </div>

      {/* Announcements Grid */}
      {announcements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-card border border-line shadow-layered space-y-4">
          <div className="w-14 h-14 bg-canvas rounded-card flex items-center justify-center text-brand">
            <CalendarDays className="w-7 h-7" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold uppercase tracking-tight text-ink">No hay convocatorias</h3>
            <p className="text-ink-soft text-[11px] mt-1">Aún no se han registrado convocatorias en este condominio.</p>
          </div>
          {isAdmin && (
            <Link
              href="/gobernanza/convocatorias/nuevo"
              className="text-brand font-bold text-[11px] uppercase tracking-widest hover:underline"
            >
              Crear la primera convocatoria
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
