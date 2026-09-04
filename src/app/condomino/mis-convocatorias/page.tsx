import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getAnnouncementsUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { AnnouncementCard } from "@/app/gobernanza/convocatorias/components/announcement-card";
import { getCurrentSession } from "@/app/actions/auth";
import { getUserPermissions } from "@/shared/application/auth/permissions";
import { prisma } from "@/shared/infrastructure/db/prisma";

export default async function MyAnnouncementsPage() {
  await requirePageAccess(MODULES.CONVOCATORIAS_CONDOMINO);

  const session = await getCurrentSession();
  if (!session) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-[#e8dbcc]">
          <p className="text-[#958172] text-sm">Por favor, inicie sesión para ver sus convocatorias.</p>
        </div>
      </div>
    );
  }

  // Quien administra convocatorias las ve todas; el resto solo las que le corresponden.
  const permissions = await getUserPermissions();
  const isAdmin = !!permissions[MODULES.CONVOCATORIAS]?.canCreate;
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-[#e8dbcc] pb-8">
        <h1 className="text-3xl font-[ui-serif] font-bold text-[#2f221a]">
          Mis convocatorias
        </h1>
        <p className="text-[#958172] text-sm">
          Próximas asambleas y reuniones de Val'Quirico.
        </p>
      </div>

      {/* Announcements List */}
      {announcements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-[#e8dbcc] space-y-4">
          <div className="w-16 h-16 bg-[#fcf9f5] rounded-2xl flex items-center justify-center text-[#6d422a]">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-[#2f221a]">No tienes convocatorias pendientes</h3>
            <p className="text-[#958172] text-sm">Te notificaremos cuando se publique una nueva asamblea.</p>
          </div>
        </div>
      )}
    </div>
  );
}
