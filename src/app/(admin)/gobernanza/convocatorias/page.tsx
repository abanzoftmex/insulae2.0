import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getAnnouncementsUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { AnnouncementsWorkbench } from "./components/announcements-workbench";
import { getCurrentSession } from "@/app/actions/auth";
import { getUserPermissions } from "@/shared/application/auth/permissions";
import { prisma } from "@/shared/infrastructure/db/prisma";

export default async function AnnouncementsPage() {
  await requirePageAccess(MODULES.CONVOCATORIAS);

  const session = await getCurrentSession();
  if (!session) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-line shadow-xs">
          <p className="text-[#64748b] text-xs font-semibold">
            Inicie sesión para ver las convocatorias.
          </p>
        </div>
      </div>
    );
  }

  const permissions = await getUserPermissions();
  // Quien puede crear convocatorias administra el listado completo; el resto ve solo las suyas.
  const canManage = !!permissions[MODULES.CONVOCATORIAS]?.canCreate;
  // El rol Master no puede editar convocatorias: canUpdate es false
  const canEdit = !!permissions[MODULES.CONVOCATORIAS]?.canUpdate;
  const isResidentView = !canManage;

  const [rawAnnouncements, formData] = await Promise.all([
    getAnnouncementsUseCase.execute(),
    getAnnouncementFormDataUseCase.execute()
  ]);

  let announcements = rawAnnouncements;
  if (!canManage) {
    const userAssignments = await prisma.condominiumStructurePositionAssignment.findMany({
      where: { userId: session.userId, isActive: true },
      select: { positionId: true }
    });
    const userPositionIds = userAssignments.map((ua) => ua.positionId);
    const userEmail = session.email ? session.email.toLowerCase() : "";

    announcements = rawAnnouncements.filter((ann) => {
      const isPositionInvited = (ann.invitedPositions || []).some((ip: any) =>
        userPositionIds.includes(ip.positionId)
      );
      const isSpecialGuest = (ann.specialGuests || []).some(
        (sg: any) => sg.email && sg.email.toLowerCase() === userEmail
      );
      return isPositionInvited || isSpecialGuest;
    });
  }

  return (
    <AnnouncementsWorkbench
      initialAnnouncements={announcements}
      canManage={canManage}
      canEdit={canEdit}
      userDirectory={formData.directory}
      types={formData.types}
      subtypes={formData.subtypes}
      isResidentView={isResidentView}
    />
  );
}
