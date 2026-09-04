import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getAnnouncementByIdUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { AsambleaDashboard } from "./components/asamblea-dashboard";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string; dateId: string }>;
}

export default async function AsambleaDashboardPage({ params }: PageProps) {
  await requirePageAccess(MODULES.CONVOCATORIAS);

  const { id, dateId } = await params;

  // 1. Fetch Convocatoria details
  const announcement = await getAnnouncementByIdUseCase.execute(id);
  if (!announcement) notFound();

  // Find current date session
  const dateSession = announcement.dates.find(d => d.id === dateId);
  if (!dateSession) notFound();

  // 2. Fetch catalogs to build lookups
  const formData = await getAnnouncementFormDataUseCase.execute();
  const allPositions = await prisma.condominiumStructurePosition.findMany({
    select: { id: true, name: true }
  });

  // Mapped Record lookups for optimal props delivery
  const userMap: Record<string, string> = formData.directory.reduce((acc, u) => {
    acc[u.id] = u.name;
    return acc;
  }, {} as Record<string, string>);

  const positionMap: Record<string, string> = allPositions.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex items-start gap-3 pb-5 border-b border-brand">
        <PageBackBadge className="mt-1.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase leading-none">
            Toma de Asamblea
          </h1>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
            Gobernanza · En Proceso
          </Badge>
          <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
            Registre la asistencia de condóminos e inicie votaciones sobre los temas del orden del día
          </p>
        </div>
      </div>

      {/* Assembly workspace dashboard component */}
      <AsambleaDashboard
        announcement={announcement}
        dateSession={dateSession}
        invitedPositions={announcement.invitedPositions || []}
        topics={announcement.topics || []}
        userMap={userMap}
        positionMap={positionMap}
      />
    </div>
  );
}
