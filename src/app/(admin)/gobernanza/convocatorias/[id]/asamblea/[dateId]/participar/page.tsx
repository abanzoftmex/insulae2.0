import { requirePageAccess } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getAnnouncementByIdUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCurrentSession } from "@/app/actions/auth";
import { ParticiparClient } from "./components/participar-client";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Lock, AlertTriangle } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string; dateId: string }>;
}

export default async function ParticiparAsambleaPage({ params }: PageProps) {
  await requirePageAccess([MODULES.CONVOCATORIAS, MODULES.CONVOCATORIAS_CONDOMINO]);

  const { id, dateId } = await params;

  // 1. Fetch user session
  const session = await getCurrentSession();
  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border border-line shadow-layered">
          <div className="w-12 h-12 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-ink uppercase tracking-tight">Acceso Restringido</h2>
            <p className="text-xs text-ink-soft leading-relaxed">
              Para poder registrar tu asistencia y votar en la asamblea, debes haber iniciado sesión en tu cuenta de condómino.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="flex items-center justify-center w-full h-10 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 2. Fetch Convocatoria details
  const announcement = await getAnnouncementByIdUseCase.execute(id);
  if (!announcement) notFound();

  // Find date session
  const dateSession = announcement.dates.find(d => d.id === dateId);
  if (!dateSession) notFound();

  // 3. Resolve user's invited positions & special guest mappings
  const userAssignments = await prisma.condominiumStructurePositionAssignment.findMany({
    where: { userId: session.userId, isActive: true },
    include: { position: true }
  });

  const invitedPositionIds = (announcement.invitedPositions || []).map(ip => ip.positionId);
  
  const matchedAssignments = userAssignments.filter(ua => invitedPositionIds.includes(ua.positionId));

  const matchedGuests = await prisma.specialGuest.findMany({
    where: {
      announcementId: id,
      email: { equals: session.email, mode: "insensitive" },
      isActive: true
    }
  });

  // Build represented keys array
  const representedKeys: { key: string; name: string; type: "POSITION" | "GUEST" }[] = [];

  for (const assignment of matchedAssignments) {
    if (assignment.position) {
      representedKeys.push({
        key: assignment.positionId,
        name: assignment.position.name,
        type: "POSITION"
      });
    }
  }

  for (const guest of matchedGuests) {
    representedKeys.push({
      key: guest.id,
      name: guest.name,
      type: "GUEST"
    });
  }

  // 4. Validate if the user is convocated at all
  if (representedKeys.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border border-line shadow-layered">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-ink uppercase tracking-tight">No Convocado</h2>
            <p className="text-xs text-ink-soft leading-relaxed">
              Tu cuenta de usuario (<strong>{session.email}</strong>) no se encuentra en la lista de puestos convocados ni de invitados especiales de esta asamblea.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/condomino/mis-convocatorias"
              className="flex items-center justify-center w-full h-10 rounded-full bg-white border border-line text-ink text-[10px] font-bold uppercase tracking-widest hover:bg-canvas transition-colors"
            >
              Volver a Mis Convocatorias
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex items-start gap-3 pb-5 border-b border-brand">
        <PageBackBadge className="mt-1.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase leading-none">
            Portal de Asamblea
          </h1>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
            Participación de Condómino
          </Badge>
          <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
            Confirme su asistencia en las propiedades representadas y emita sus opiniones y votos
          </p>
        </div>
      </div>

      <ParticiparClient
        announcement={announcement}
        dateSession={dateSession}
        topics={announcement.topics || []}
        representedKeys={representedKeys}
      />
    </div>
  );
}

// Simple wrapper card component inline to avoid extra dependencies
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-card bg-white border border-line ${className || ""}`}>
      {children}
    </div>
  );
}
