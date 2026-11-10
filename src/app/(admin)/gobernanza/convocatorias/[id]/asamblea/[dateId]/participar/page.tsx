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
import {
  isAsamblea,
  getMeetingNoun,
  getTopicsActionSummary
} from "@/app/(admin)/gobernanza/convocatorias/_lib/governance-terms";
import { Lock, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

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
        <Card className="max-w-md w-full p-6 text-center space-y-4 border border-[#e2e8f0] shadow-sm rounded-2xl">
          <div className="w-12 h-12 bg-[#304854]/10 text-[#304854] rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#0f172a] uppercase tracking-tight">Acceso Restringido</h2>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Para poder registrar tu asistencia y votar en la asamblea, debes haber iniciado sesión en tu cuenta de condómino.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="flex items-center justify-center w-full h-10 rounded-full bg-[#304854] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#23353e] transition-colors"
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
  const dateSession = announcement.dates.find((d) => d.id === dateId);
  if (!dateSession) notFound();

  const announcementStatus = announcement.status?.name || "";
  const dateStatus = dateSession.status || "";

  // 3. Validar si la convocatoria o sesión aún no ha iniciado
  const isStarted =
    announcementStatus === "En Proceso" ||
    announcementStatus === "Iniciada" ||
    dateStatus === "En Proceso" ||
    dateStatus === "Iniciada";

  const isClosed =
    announcementStatus === "Terminada" ||
    announcementStatus === "Cancelada" ||
    announcementStatus === "Cerrada" ||
    dateStatus === "Realizada" ||
    dateStatus === "No Realizada";

  // Terminología dinámica
  const isAsambleaType = isAsamblea(announcement);
  const meetingNoun = getMeetingNoun(isAsambleaType, { capitalized: true });
  const meetingNounLower = getMeetingNoun(isAsambleaType, { capitalized: false });
  const topicsSummary = getTopicsActionSummary(announcement.topics || []);

  if (!isStarted && !isClosed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border border-[#d0b685]/50 shadow-md rounded-2xl bg-white">
          <div className="w-12 h-12 bg-[#fcf8f0] border border-[#d0b685] text-[#947133] rounded-full flex items-center justify-center mx-auto shadow-xs">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#fcf8f0] border border-[#d0b685]/60 text-[#947133]">
              Sesión Pendiente
            </span>
            <h2 className="text-lg font-bold text-[#304854] uppercase tracking-tight">
              Convocatoria no iniciada
            </h2>
            <p className="text-xs text-[#64748b] leading-relaxed">
              La {meetingNounLower} <strong>«{announcement.name}»</strong> aún no ha comenzado. Los controles de participación y {topicsSummary.isOnlyConfirmation ? "confirmación" : "votación"} se habilitarán automáticamente en cuanto la administración o el moderador inicien formalmente la sesión.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href={`/gobernanza/convocatorias/${id}`}
              className="flex items-center justify-center w-full h-10 rounded-full bg-[#304854] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#23353e] transition-colors"
            >
              Ver detalles de la convocatoria
            </Link>
            <Link
              href="/gobernanza/convocatorias"
              className="flex items-center justify-center w-full h-9 rounded-full bg-white border border-[#e2e8f0] text-[#64748b] text-[10px] font-bold uppercase tracking-widest hover:bg-[#f8fafc] transition-colors"
            >
              Volver al listado
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border border-[#e2e8f0] shadow-sm rounded-2xl bg-white">
          <div className="w-12 h-12 bg-[#f8fafc] border border-[#cbd5e1] text-[#64748b] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-[#304854]" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#f1f5f9] border border-[#cbd5e1] text-[#475569]">
              {dateStatus || announcementStatus}
            </span>
            <h2 className="text-lg font-bold text-[#0f172a] uppercase tracking-tight">
              Convocatoria concluida
            </h2>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Esta asamblea o llamado ha finalizado. La toma de asistencia y las votaciones sobre los temas del orden del día se encuentran cerradas.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/gobernanza/convocatorias/${id}`}
              className="flex items-center justify-center w-full h-10 rounded-full bg-[#304854] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#23353e] transition-colors"
            >
              Ver resumen de la convocatoria
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 4. Resolve user's invited positions & special guest mappings
  const userAssignments = await prisma.condominiumStructurePositionAssignment.findMany({
    where: { userId: session.userId, isActive: true },
    include: { position: true },
  });

  const invitedPositionIds = (announcement.invitedPositions || []).map((ip) => ip.positionId);
  const matchedAssignments = userAssignments.filter((ua) => invitedPositionIds.includes(ua.positionId));

  const sessionEmail = (session.email ?? "").trim().toLowerCase();
  const matchedGuests = sessionEmail
    ? (await prisma.specialGuest.findMany({ where: { announcementId: id, isActive: true } })).filter(
        (guest) => guest.email?.trim().toLowerCase() === sessionEmail,
      )
    : [];

  // Build represented keys array
  const representedKeys: { key: string; name: string; type: "POSITION" | "GUEST" }[] = [];

  for (const assignment of matchedAssignments) {
    if (assignment.position) {
      representedKeys.push({
        key: assignment.positionId,
        name: assignment.position.name,
        type: "POSITION",
      });
    }
  }

  for (const guest of matchedGuests) {
    representedKeys.push({
      key: guest.id,
      name: guest.name,
      type: "GUEST",
    });
  }

  // 5. Validate if the user is convocated at all
  if (representedKeys.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border border-[#e2dbce] shadow-sm rounded-2xl bg-white">
          <div className="w-12 h-12 bg-[#faf8f5] border border-[#d0b685] text-[#d0b685] rounded-full flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle className="h-6 w-6 text-[#947133]" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#faf8f5] border border-[#d0b685]/70 text-[#947133]">
              Acceso Convocados
            </span>
            <h2 className="text-lg font-bold text-[#304854] uppercase tracking-tight">No Convocado</h2>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Tu cuenta de usuario (<strong>{session.email}</strong>) no se encuentra registrada en la lista de puestos convocados ni de invitados especiales para esta {meetingNounLower}.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/gobernanza/convocatorias"
              className="flex items-center justify-center w-full h-10 rounded-full bg-white border border-[#cbd5e1] text-[#304854] text-[10px] font-bold uppercase tracking-widest hover:bg-[#faf8f5] transition-colors"
            >
              Volver a Convocatorias
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex items-start gap-3 pb-5 border-b border-[#304854]/20">
        <PageBackBadge className="mt-1.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold text-[#304854] tracking-tighter uppercase leading-none">
            Portal de {meetingNoun}
          </h1>
          <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">
            Participación de Condómino
          </Badge>
          <p className="text-[#64748b] text-[11px] font-bold uppercase tracking-tight">
            Confirme su asistencia en las propiedades representadas y registre su {topicsSummary.isOnlyConfirmation ? "confirmación de temas" : "opinión y voto en los temas"}
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
    <div className={`bg-white border border-[#e2e8f0] ${className || ""}`}>
      {children}
    </div>
  );
}
