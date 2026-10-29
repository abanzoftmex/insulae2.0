"use client";

import { useState, useTransition } from "react";
import { Announcement } from "@/modules/announcement/domain/announcement.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  FileText,
  MapPin,
  Clock,
  Users,
  MoreVertical,
  Eye,
  Edit2,
  Play,
  Mail,
  MessageCircle,
  Loader2,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sendAnnouncementInvitationAction, getAnnouncementWhatsAppTextAction } from "../[id]/asamblea/actions";

const WHATSAPP_NUMBER = "5212212721794";

interface AnnouncementCardProps {
  announcement: Announcement;
  canManage?: boolean;
}

export function AnnouncementCard({ announcement, canManage = false }: AnnouncementCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSending, startSendingTransition] = useTransition();
  const [isSendingWA, startSendingWATransition] = useTransition();
  const [waRecipients, setWaRecipients] = useState<{ name: string; position: string; phone: string }[] | null>(null);
  const [waText, setWaText] = useState<string>("");
  const pathname = usePathname();
  const isResidentView = pathname.startsWith("/condomino");

  const handleSendByWhatsApp = () => {
    startSendingWATransition(async () => {
      const res = await getAnnouncementWhatsAppTextAction(announcement.id);
      setDropdownOpen(false);
      if (res.success && res.text) {
        setWaText(res.text);
        if (res.recipients && res.recipients.length > 0) {
          setWaRecipients(res.recipients);
        } else {
          const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(res.text)}`;
          window.open(url, "_blank");
        }
      } else {
        alert(`Error al preparar mensaje de WhatsApp: ${res.error}`);
      }
    });
  };

  const handleSendByEmail = () => {
    if (confirm("¿Estás seguro de que deseas enviar esta convocatoria por correo electrónico a todos los participantes e invitados?")) {
      startSendingTransition(async () => {
        const res = await sendAnnouncementInvitationAction(announcement.id);
        setDropdownOpen(false);
        if (res.success) {
          alert(`Convocatoria enviada con éxito.\nTotal de correos enviados: ${res.sentCount}.\nFallidos: ${res.failedCount}.`);
        } else {
          alert(`Error al enviar correos: ${res.error}`);
        }
      });
    }
  };

  return (
    <>
      <Card className="overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
      {/* Brand accent bar */}
      <div className="h-0.5 bg-brand w-full" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="brand">{announcement.type.name}</Badge>
              <span className="text-[9px] font-bold uppercase tracking-widest text-ink-soft">
                {announcement.subtype.name}
              </span>
            </div>
            <h3 className="text-sm font-bold text-ink leading-tight line-clamp-2">
              {announcement.name}
            </h3>
          </div>
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm bg-canvas border border-line text-ink-soft whitespace-nowrap">
            {announcement.status.name}
          </span>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          {announcement.dates.map((date) => (
            <div key={date.id} className="flex items-start gap-3 p-3 rounded-card bg-canvas border border-line">
              <div className="bg-brand text-white text-center rounded-sm min-w-11 py-1 shrink-0">
                <div className="text-[9px] uppercase font-bold opacity-70 leading-none">
                  {format(new Date(date.date), "MMM", { locale: es })}
                </div>
                <div className="text-base font-bold leading-tight">
                  {format(new Date(date.date), "dd")}
                </div>
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-tight">{date.callType}</span>
                  {date.time && (
                    <span className="flex items-center gap-0.5 text-[9px] font-medium text-ink-soft shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {date.time}
                    </span>
                  )}
                </div>
                {date.location && (
                  <p className="flex items-center gap-0.5 text-[10px] text-ink-soft truncate">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {date.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-line">
          <div className="flex items-center gap-3 text-[10px] text-ink-soft font-bold uppercase tracking-tight">
            <span>
              <span className="text-brand">{announcement.topics.length}</span> Temas
            </span>
            {announcement.actualAttendance > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-2.5 w-2.5" />
                <span className="text-brand">{announcement.attendancePercentage}%</span> Asist.
              </span>
            )}
          </div>
          
          <div className="flex gap-1.5 items-center relative">
            {announcement.pdfUrl && (
              <a
                href={announcement.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-7 h-7 rounded-sm bg-canvas border border-line text-ink-soft hover:bg-brand hover:text-white hover:border-brand transition-colors"
                title="Ver PDF"
              >
                <FileText className="h-3.5 w-3.5" />
              </a>
            )}

            {/* Action Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-center w-7 h-7 rounded-sm bg-canvas border border-line text-ink-soft hover:bg-brand hover:text-white hover:border-brand transition-colors"
                title="Opciones"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>

              {/* Dropdown Menu options */}
              {dropdownOpen && (
                <>
                  {/* Invisible click-away overlay */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  
                  <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl border border-line/60 bg-white p-1.5 shadow-layered z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <Link
                      href={`/gobernanza/convocatorias/${announcement.id}`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ink hover:bg-canvas transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-ink-soft" />
                      Ver detalles
                    </Link>

                    {canManage && (
                      <>
                        <Link
                          href={`/gobernanza/convocatorias/${announcement.id}/editar`}
                          onClick={() => setDropdownOpen(false)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ink hover:bg-canvas transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-ink-soft" />
                          Editar convocatoria
                        </Link>

                        <Link
                          href={`/gobernanza/convocatorias/${announcement.id}/asamblea`}
                          onClick={() => setDropdownOpen(false)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ink hover:bg-canvas transition-colors"
                        >
                          <Play className="h-3.5 w-3.5 text-ink-soft" />
                          Iniciar asamblea
                        </Link>

                        <button
                          type="button"
                          disabled={isSending}
                          onClick={handleSendByEmail}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ink hover:bg-canvas transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isSending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                          ) : (
                            <Mail className="h-3.5 w-3.5 text-ink-soft" />
                          )}
                          {isSending ? "Enviando..." : "Enviar por correo"}
                        </button>

                        <a
                          role="button"
                          onClick={handleSendByWhatsApp}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ink hover:bg-canvas transition-colors cursor-pointer ${isSendingWA ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          {isSendingWA ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#25D366]" />
                          ) : (
                            <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                          )}
                          {isSendingWA ? "Preparando..." : "Enviar por WhatsApp"}
                        </a>
                      </>
                    )}

                    {isResidentView && (announcement.status.name === "En Proceso" || announcement.status.name === "Iniciada") && announcement.dates[0] && (
                      <Link
                        href={`/gobernanza/convocatorias/${announcement.id}/asamblea/${announcement.dates[0].id}/participar`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-brand hover:bg-brand/5 transition-colors"
                      >
                        <Play className="h-3.5 w-3.5 text-brand fill-brand" />
                        Participar
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
      {waRecipients && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWaRecipients(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#2f221a]">
                  Enviar Invitación por WhatsApp
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase">
                  Selecciona a quién deseas enviar el mensaje
                </p>
              </div>
              <button 
                onClick={() => setWaRecipients(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {waRecipients.map((rec, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/30 transition-all">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-bold text-slate-800 truncate">{rec.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 truncate">{rec.position}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{rec.phone}</p>
                  </div>
                  <a
                    href={`https://api.whatsapp.com/send?phone=${rec.phone}&text=${encodeURIComponent(waText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setWaRecipients(null)}
                    className="h-8 px-3 rounded-full bg-[#25D366] hover:bg-[#20ba56] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Enviar
                  </a>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWaRecipients(null)}
                className="w-full h-9 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                Abrir selector de contactos
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
