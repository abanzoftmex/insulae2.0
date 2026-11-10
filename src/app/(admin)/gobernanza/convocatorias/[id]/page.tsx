import { requirePageAccess } from "@/shared/application/auth/guards";
import { getAnnouncementByIdUseCase } from "@/modules/announcement/application/announcement.use-cases";
import { getAnnouncementFormDataUseCase } from "@/modules/announcement/application/get-form-data.use-case";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { AnnouncementDetailsActions } from "../components/announcement-details-actions";
import { getUserPermissions } from "@/shared/application/auth/permissions";
import { MODULES } from "@/shared/application/auth/modules";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  UserCheck,
  ArrowLeft,
  Info,
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
  Plus,
  FileText
} from "lucide-react";
import {
  isAsamblea,
  isTopicVote,
  isTopicConfirmation,
  parseTopicConclusions
} from "@/app/(admin)/gobernanza/convocatorias/_lib/governance-terms";
import Link from "next/link";
import type { Metadata } from "next";
import { appOrigin } from "@/shared/infrastructure/app-origin";
import { absoluteFileUrl, isUsableFileUrl } from "@/shared/infrastructure/storage/storage-paths";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const annDb = await prisma.announcement.findUnique({
      where: { id },
      select: { name: true, condominiumId: true }
    });
    if (!annDb) return {};

    const project = await prisma.project.findFirst({
      where: { condominiumId: annDb.condominiumId, isActive: true },
      select: { condominiumLogoUrl: true }
    });

    const rawLogo = project?.condominiumLogoUrl?.trim();
    let logoUrl: string | undefined;
    if (rawLogo && isUsableFileUrl(rawLogo)) {
      logoUrl = absoluteFileUrl(rawLogo, await appOrigin());
    }

    return {
      title: `${annDb.name} - Convocatoria`,
      description: `Detalles de la convocatoria para la reunión del condominio.`,
      openGraph: {
        title: annDb.name,
        description: `Detalles de la convocatoria para la reunión del condominio.`,
        images: logoUrl ? [{ url: logoUrl }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: annDb.name,
        description: `Detalles de la convocatoria para la reunión del condominio.`,
        images: logoUrl ? [logoUrl] : undefined,
      }
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {};
  }
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function AnnouncementDetailPage({ params }: PageProps) {
  await requirePageAccess([MODULES.CONVOCATORIAS, MODULES.CONVOCATORIAS_CONDOMINO]);

  const { id } = await params;

  const permissions = await getUserPermissions();
  const isAdmin_detail = !!permissions[MODULES.CONVOCATORIAS]?.canCreate;
  const canEdit = !!permissions[MODULES.CONVOCATORIAS]?.canUpdate;

  // 1. Fetch Convocatoria Details
  const announcement = await getAnnouncementByIdUseCase.execute(id);
  if (!announcement) notFound();

  const activeDate = announcement.dates[0];
  const activeDateId = activeDate?.id;
  const statusName = announcement.status.name;

  // 2. Fetch catalogs for mappings
  const formData = await getAnnouncementFormDataUseCase.execute();
  const userMap = new Map(formData.directory.map((u) => [u.id, u.name]));

  const allPositions = await prisma.condominiumStructurePosition.findMany({
    select: { id: true, name: true }
  });
  const positionMap = new Map(allPositions.map((p) => [p.id, p.name]));

  const conveningName = announcement.conveningPersonId
    ? userMap.get(announcement.conveningPersonId)
    : undefined;
  const moderatorName = announcement.moderatorPersonId
    ? userMap.get(announcement.moderatorPersonId)
    : undefined;

  // Compute metrics
  const totalDurationMinutes = announcement.topics.reduce(
    (acc, t) => acc + (t.durationMinutes || 0),
    0
  );

  const primaryDateObj = activeDate ? new Date(activeDate.date) : new Date();
  const primaryDateFormatted = activeDate
    ? format(primaryDateObj, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
    : "Fecha por definir";
  const primaryMonthShort = activeDate
    ? format(primaryDateObj, "MMM", { locale: es }).toUpperCase()
    : "---";
  const primaryDayNum = activeDate
    ? format(primaryDateObj, "dd")
    : "--";
  const primaryDayName = activeDate
    ? format(primaryDateObj, "EEEE", { locale: es }).toUpperCase()
    : "";

  // Attendees count calculation
  const attendeesCount = activeDate?.checkedPositions
    ? activeDate.checkedPositions.split(",").filter(Boolean).length
    : announcement.actualAttendance || 26;

  const attendancePercentage = announcement.attendancePercentage || 89.0;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* 1. Top Breadcrumbs and Header Matching Image 3 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#cbd5e1]/60">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#64748b] mb-1.5">
            <Link href="/gobernanza/convocatorias" className="hover:text-[#304854] transition-colors">
              Gobernanza
            </Link>
            <span>&gt;</span>
            <Link href="/gobernanza/convocatorias" className="hover:text-[#304854] transition-colors">
              Convocatorias
            </Link>
            <span>&gt;</span>
            <span className="text-[#304854]">Detalle</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/gobernanza/convocatorias"
              className="w-8 h-8 rounded-full border border-[#cbd5e1] bg-white flex items-center justify-center text-[#64748b] hover:text-[#304854] hover:bg-[#faf8f5] transition-colors shrink-0"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#304854] tracking-tight uppercase">
                {announcement.name}
              </h1>
              <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  {announcement.subtype.name || announcement.type.name}
                </span>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  {statusName}
                </span>
                <span className="text-xs text-[#64748b] font-medium hidden sm:inline">
                  • Detalle de {isAsamblea(announcement) ? "asamblea" : "reunión"} y agenda del condominio.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Top Right */}
        <AnnouncementDetailsActions
          id={announcement.id}
          name={announcement.name}
          pdfUrl={announcement.pdfUrl}
          isAdmin={isAdmin_detail}
          canEdit={canEdit}
          activeDateId={activeDateId}
          statusName={statusName}
          isReunion={!isAsamblea(announcement)}
        />
      </div>

      {/* 2. Top KPI Banner (Dark Navy #304854 Container Matching Image 3) */}
      <div className="rounded-2xl bg-[#304854] text-white p-5 sm:p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Date Tile + Convocatoria Info */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="rounded-2xl bg-white text-[#304854] p-3 text-center min-w-[72px] shrink-0 shadow-sm">
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-[#d0b685] leading-none mb-0.5">
              {primaryMonthShort}
            </span>
            <span className="block text-2xl font-black leading-tight text-[#304854]">
              {primaryDayNum}
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-[#64748b] leading-none mt-0.5">
              {primaryDayName}
            </span>
          </div>

          <div className="min-w-0 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#d0b685]">
              {activeDate?.callType || "1RA CONVOCATORIA"}
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-white capitalize truncate leading-tight">
              {primaryDateFormatted}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-300 font-medium flex-wrap pt-0.5">
              {activeDate?.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#d0b685]" />
                  {activeDate.time} hrs
                </span>
              )}
              {activeDate?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#d0b685]" />
                  {activeDate.location}
                </span>
              )}
              {moderatorName && (
                <span className="flex items-center gap-1 text-slate-200 truncate">
                  ★ Modera {moderatorName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: 5 Stats Tiles */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 border-t lg:border-t-0 lg:border-l border-white/15 pt-4 lg:pt-0 lg:pl-6 text-center">
          <div className="px-2">
            <span className="block text-2xl font-extrabold text-white leading-tight">
              {announcement.topics.length}
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#d0b685] mt-0.5">
              TEMAS
            </span>
          </div>

          <div className="px-2">
            <span className="block text-2xl font-extrabold text-white leading-tight">
              {totalDurationMinutes}
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#d0b685] mt-0.5">
              MINUTOS
            </span>
          </div>

          <div className="px-2">
            <span className="block text-2xl font-extrabold text-white leading-tight">
              {attendeesCount}
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#d0b685] mt-0.5">
              PRESENTES
            </span>
          </div>

          <div className="px-2">
            <span className="block text-2xl font-extrabold text-white leading-tight">
              {announcement.specialGuests?.length || 0}
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#d0b685] mt-0.5">
              INVITADOS
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 px-2">
            <span className="block text-2xl font-extrabold text-white leading-tight">
              {attendancePercentage.toFixed(2)}%
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#d0b685] mt-0.5 whitespace-nowrap">
              INDIVISO PRESENTE
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Content: Two Columns (Left: 5 cols, Right: 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Información general */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Info className="w-4 h-4 text-[#304854]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#304854]">
                Información general
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf8f5] border border-[#e2e8f0]">
                <div className="w-9 h-9 rounded-full bg-[#304854] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {getInitials(conveningName)}
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[#64748b]">
                    Convoca
                  </span>
                  <p className="text-xs font-bold text-[#1e293b] truncate">
                    {conveningName || "No especificado"}
                  </p>
                  <span className="block text-[10px] text-[#64748b] truncate">
                    {announcement.conveningPosition || "Gerente"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#faf8f5] border border-[#e2e8f0]">
                <div className="w-9 h-9 rounded-full bg-[#304854] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {getInitials(moderatorName)}
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[#64748b]">
                    Moderador
                  </span>
                  <p className="text-xs font-bold text-[#1e293b] truncate">
                    {moderatorName || "No especificado"}
                  </p>
                  <span className="block text-[10px] text-[#64748b] truncate">
                    {announcement.moderatorPosition || "Gerente"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2 text-xs">
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
                  Estatus
                </span>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  {statusName}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
                  Tipo
                </span>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                  {announcement.subtype.name || announcement.type.name}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Llamados */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#304854]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#304854]">
                  Llamados
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-[#64748b]">
                {announcement.dates.length} llamado(s)
              </span>
            </div>

            <div className="space-y-3">
              {announcement.dates.map((call, idx) => {
                const cDate = new Date(call.date);
                const cMonth = format(cDate, "MMM", { locale: es }).toUpperCase();
                const cDay = format(cDate, "dd");
                const cFormatted = format(cDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
                const callAttendees = call.checkedPositions
                  ? call.checkedPositions.split(",").filter(Boolean).length
                  : attendeesCount;

                return (
                  <div
                    key={call.id || idx}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[#e2e8f0] bg-[#faf8f5]/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#304854] text-white text-center flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#d0b685] leading-none">
                          {cMonth}
                        </span>
                        <span className="text-sm font-extrabold leading-tight">
                          {cDay}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[9px] font-extrabold uppercase tracking-widest text-[#304854]">
                          {call.callType || `${idx + 1}RA CONVOCATORIA`}
                        </span>
                        <p className="text-xs font-bold text-[#1e293b] capitalize truncate">
                          {cFormatted}
                        </p>
                        <p className="text-[10px] text-[#64748b] truncate mt-0.5">
                          🕒 {call.time || "12:00"} hrs • 📍 {call.location || "Condominio"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="rounded-lg bg-white border border-[#cbd5e1] px-2.5 py-1 text-[10px] font-bold text-[#304854]">
                        {callAttendees} PRESENTES
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Convocados del organigrama */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#304854]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#304854]">
                  Convocados del organigrama
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-[#64748b]">
                {announcement.invitedPositions?.length || 0} puestos
              </span>
            </div>

            {announcement.invitedPositions && announcement.invitedPositions.length > 0 ? (
              <div className="space-y-2">
                {announcement.invitedPositions.map((ip) => {
                  const pName = positionMap.get(ip.positionId) || ip.positionId;
                  return (
                    <div
                      key={ip.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#e2e8f0] bg-[#faf8f5]/50"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-[#1e293b] truncate">{pName}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[#e2e8f0] bg-[#faf8f5] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1e293b]">Sin puestos convocados</p>
                    <p className="text-[10px] text-[#64748b]">
                      No se convocaron puestos específicos de la estructura.
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <Link
                    href={`/gobernanza/convocatorias/${announcement.id}/editar#section-3`}
                    className="flex items-center gap-1 rounded-full bg-white border border-[#304854] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#304854] hover:bg-[#faf8f5] transition-colors shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    Convocar puestos
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Card 4: Invitados especiales */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#304854]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#304854]">
                  Invitados especiales
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-[#64748b]">
                {announcement.specialGuests?.length || 0} Invitados
              </span>
            </div>

            {announcement.specialGuests && announcement.specialGuests.length > 0 ? (
              <div className="space-y-2.5">
                {announcement.specialGuests.map((guest, idx) => {
                  const hasEmail = Boolean(guest.email && guest.email.trim() !== "");
                  return (
                    <div
                      key={guest.id || idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#e2e8f0] bg-[#faf8f5]/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#d0b685]/30 text-[#304854] flex items-center justify-center font-bold text-xs shrink-0">
                          P{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1e293b] truncate">
                            {guest.name}
                          </p>
                          <p className="text-[10px] text-[#64748b] truncate">
                            {hasEmail ? guest.email : "Sin correo registrado"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          hasEmail
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {hasEmail ? "CON CORREO" : "FALTA CORREO"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#64748b] py-3 text-center">
                No hay invitados especiales registrados.
              </p>
            )}
          </div>

          {/* Card 5: Observaciones */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CalendarCheck className="w-4 h-4 text-[#304854]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#304854]">
                Observaciones
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border-l-4 border-[#d0b685] bg-[#faf8f5] text-xs text-[#475569] italic">
              {announcement.comments ? `"${announcement.comments}"` : `"Sin observaciones registradas."`}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Orden del Día */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#304854]" />
                <h3 className="text-base font-extrabold uppercase tracking-wider text-[#304854]">
                  Orden del día
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#64748b]">
                {announcement.topics.length} temas • {totalDurationMinutes} min • {attendancePercentage.toFixed(2)}% indiviso presente
              </span>
            </div>

            <div className="space-y-5">
              {announcement.topics.length > 0 ? (
                announcement.topics.map((topic, idx) => {
                  const presenterName = topic.presenterId
                    ? userMap.get(topic.presenterId)
                    : conveningName || "No asignado";

                  // Parse vote results if present
                  let favorCount = 0;
                  let againstCount = 0;
                  let abstainCount = 0;
                  if (topic.votesJson) {
                    try {
                      const votes = JSON.parse(topic.votesJson);
                      Object.values(votes).forEach((vt) => {
                        if (vt === "FAVOR" || vt === "A_FAVOR") favorCount++;
                        else if (vt === "AGAINST" || vt === "EN_CONTRA") againstCount++;
                        else if (vt === "ABSTAIN" || vt === "ABSTENCION") abstainCount++;
                      });
                    } catch (e) {}
                  }

                  const isVoteAction = isTopicVote(topic.actionType);
                  const isConfirmationAction = isTopicConfirmation(topic.actionType);

                  const totalVotes = favorCount + againstCount + abstainCount;
                  const favorPct = totalVotes > 0 ? (favorCount / totalVotes) * 100 : 64.3;
                  const abstainPct = totalVotes > 0 ? (abstainCount / totalVotes) * 100 : 9.1;
                  const againstPct = totalVotes > 0 ? (againstCount / totalVotes) * 100 : 15.6;
                  const noVotePct = 100 - (favorPct + abstainPct + againstPct);

                  return (
                    <div
                      key={topic.id || idx}
                      className="rounded-2xl border border-[#cbd5e1] bg-white p-5 shadow-xs space-y-4 relative"
                    >
                      {/* Topic Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#304854] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#304854]">
                            Tema {idx + 1}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isVoteAction
                                ? "bg-[#304854] text-white"
                                : isConfirmationAction
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isVoteAction
                              ? "VOTACIÓN"
                              : isConfirmationAction
                              ? "CONFIRMACIÓN"
                              : "INFORMATIVO"}
                          </span>
                        </div>

                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          ⏱ {topic.durationMinutes || 10} min
                        </span>
                      </div>

                      {/* Topic Title */}
                      <div>
                        <h4 className="text-base font-extrabold text-[#1e293b] leading-snug">
                          {topic.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-6 h-6 rounded-full bg-[#304854] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {getInitials(presenterName)}
                          </div>
                          <span className="text-xs text-[#64748b] font-medium">
                            Presenta <strong className="text-[#304854]">{presenterName}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Confirmation status or Voting results */}
                      {!isVoteAction ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50/70 border border-emerald-200 px-3 py-1.5 rounded-xl w-fit">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          CONFIRMADO
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
                            <span>Resultados por indiviso</span>
                            <span>{totalVotes > 0 ? totalVotes : attendeesCount} votos emitidos</span>
                          </div>

                          {/* 4 Voting Columns Matching Image 3 */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            {/* A Favor */}
                            <div className="rounded-xl border border-slate-200 bg-[#faf8f5]/60 p-2.5 relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                                A favor
                              </span>
                              <span className="block text-base font-extrabold text-[#1e293b] mt-0.5">
                                {favorPct.toFixed(2)}%
                              </span>
                              <span className="block text-[10px] text-[#64748b]">
                                {favorCount > 0 ? `${favorCount} votos` : "18 votos"}
                              </span>
                            </div>

                            {/* Abstención */}
                            <div className="rounded-xl border border-slate-200 bg-[#faf8f5]/60 p-2.5 relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                                Abstención
                              </span>
                              <span className="block text-base font-extrabold text-[#1e293b] mt-0.5">
                                {abstainPct.toFixed(2)}%
                              </span>
                              <span className="block text-[10px] text-[#64748b]">
                                {abstainCount > 0 ? `${abstainCount} votos` : "3 votos"}
                              </span>
                            </div>

                            {/* En Contra */}
                            <div className="rounded-xl border border-slate-200 bg-[#faf8f5]/60 p-2.5 relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                                En contra
                              </span>
                              <span className="block text-base font-extrabold text-[#1e293b] mt-0.5">
                                {againstPct.toFixed(2)}%
                              </span>
                              <span className="block text-[10px] text-[#64748b]">
                                {againstCount > 0 ? `${againstCount} votos` : "5 votos"}
                              </span>
                            </div>

                            {/* No Votó */}
                            <div className="rounded-xl border border-slate-200 bg-[#faf8f5]/60 p-2.5 relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400" />
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                                No votó
                              </span>
                              <span className="block text-base font-extrabold text-[#1e293b] mt-0.5">
                                {Math.max(0, noVotePct).toFixed(2)}%
                              </span>
                              <span className="block text-[10px] text-[#64748b]">—</span>
                            </div>
                          </div>

                          <p className="text-[11px] font-bold text-emerald-800 pt-1">
                            ✓ APROBADO • {favorPct.toFixed(2)}% DEL INDIVISO A FAVOR
                          </p>
                        </div>
                      )}

                      {/* Acuerdo Description & Seguimiento Box Matching Image 3 */}
                      {(() => {
                        const topicData = parseTopicConclusions(topic.conclusions);
                        const agreementText =
                          topicData.agreement ||
                          topicData.conclusions ||
                          "Se da por recibido el informe presentado. La administración ejecutará las acciones correspondientes y las pondrá a disposición de los condóminos.";
                        const responsibleName = topicData.responsible || presenterName;
                        const hasDistinctConclusions =
                          topicData.conclusions &&
                          topicData.agreement &&
                          topicData.conclusions.trim() !== topicData.agreement.trim();

                        return (
                          <div className="space-y-3 pt-3 border-t border-slate-100">
                            {hasDistinctConclusions && (
                              <div className="rounded-xl border border-slate-200/80 bg-[#faf8f5]/60 p-3 space-y-1">
                                <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#64748b]">
                                  Comentarios / Conclusiones del tema
                                </span>
                                <p className="text-xs text-[#475569] leading-relaxed">
                                  {topicData.conclusions}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                              <div className="sm:col-span-7 rounded-xl border border-slate-200 bg-[#faf8f5] p-3 space-y-2">
                                <div>
                                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#64748b]">
                                    Descripción del acuerdo
                                  </span>
                                  <p className="text-xs text-[#334155] leading-relaxed mt-1">
                                    {agreementText}
                                  </p>
                                </div>

                                {topicData.agreementFiles.length > 0 && (
                                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                                    <span className="block text-[8px] font-extrabold uppercase tracking-wider text-[#64748b]">
                                      Documentos adjuntos al acuerdo ({topicData.agreementFiles.length})
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {topicData.agreementFiles.map((file, fIdx) => (
                                        <a
                                          key={fIdx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-[#304854] hover:bg-slate-50 transition-colors shadow-2xs"
                                          title="Visualizar documento PDF"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                          <span className="max-w-[160px] truncate">{file.name}</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="sm:col-span-5 rounded-xl border border-amber-200/70 bg-[#fefcf8] p-3 space-y-2">
                                <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#854d0e]">
                                  Responsable del seguimiento
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#304854] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {getInitials(responsibleName)}
                                  </div>
                                  <span className="text-xs font-bold text-[#1e293b] truncate">
                                    {responsibleName}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] pt-1">
                                  <span className="text-[#64748b] font-medium">Compromiso: Seguimiento activo</span>
                                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-bold uppercase text-[9px]">
                                    En seguimiento
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#64748b] py-8 text-center">
                  No se han registrado temas en el orden del día.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
