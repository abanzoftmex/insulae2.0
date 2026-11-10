import { requirePageAccess } from "@/shared/application/auth/guards";
import { readAdminSession } from "@/shared/application/auth/permissions";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { MODULES } from "@/shared/application/auth/modules";
import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { getAnnouncementByIdUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { AnnouncementForm } from "../../nuevo/components/announcement-form";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAnnouncementPage({ params }: PageProps) {
  await requirePageAccess(MODULES.CONVOCATORIAS, "canUpdate");

  // Restricción: El usuario con rol Master (no ADMIN) no puede acceder a editar convocatorias
  const session = await readAdminSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        userType: true,
        initialRole: true,
        userRoles: { select: { role: { select: { name: true } } } }
      }
    });
    const isMaster =
      user?.userType !== "ADMIN" &&
      (user?.userRoles.some((ur) => ur.role.name?.trim().toLowerCase() === "master") ||
        user?.initialRole?.trim().toLowerCase() === "master");
    if (isMaster) {
      redirect("/acceso-denegado?modulo=Convocatorias");
    }
  }

  const { id } = await params;

  // 1. Fetch catalogs and current convocatoria details
  const [formData, announcement] = await Promise.all([
    getAnnouncementFormDataUseCase.execute(),
    getAnnouncementByIdUseCase.execute(id)
  ]);

  if (!announcement) notFound();

  return (
    <div className="animate-in fade-in duration-300">
      <AnnouncementForm initialData={formData} announcement={announcement} />
    </div>
  );
}
