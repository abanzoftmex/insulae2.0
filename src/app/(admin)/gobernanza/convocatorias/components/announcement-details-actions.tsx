"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Edit2, Play, Mail, MessageCircle, Loader2, X, FileText } from "lucide-react";
import { sendAnnouncementInvitationAction, getAnnouncementWhatsAppTextAction } from "../[id]/asamblea/actions";

interface AnnouncementDetailsActionsProps {
  id: string;
  name?: string;
  pdfUrl?: string | null;
  isAdmin?: boolean;
  canEdit?: boolean;
  activeDateId?: string;
  statusName?: string;
  isReunion?: boolean;
}

export function AnnouncementDetailsActions({
  id,
  name = "",
  pdfUrl,
  isAdmin = false,
  canEdit = true,
  activeDateId,
  statusName,
  isReunion = false
}: AnnouncementDetailsActionsProps) {
  const [isSending, startSendingTransition] = useTransition();
  const [isSendingWA, startSendingWATransition] = useTransition();
  const [waRecipients, setWaRecipients] = useState<{ name: string; position: string; phone: string }[] | null>(null);
  const [waText, setWaText] = useState<string>("");

  const handleSendByWhatsApp = () => {
    startSendingWATransition(async () => {
      const res = await getAnnouncementWhatsAppTextAction(id);
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
        const res = await sendAnnouncementInvitationAction(id);
        if (res.success) {
          alert(
            res.message ||
              `Convocatoria enviada con éxito.\nTotal de correos enviados: ${res.sentCount}.\nFallidos: ${res.failedCount}.`
          );
        } else {
          alert(`Error al enviar correos: ${res.error || res.message}`);
        }
      });
    }
  };

  const isSessionActive = statusName === "En Proceso" || statusName === "Iniciada";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 1. Ver PDF */}
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#304854] hover:bg-[#faf8f5] transition-colors shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5 text-[#64748b]" />
          Ver PDF
        </a>
      )}

      {/* 2. Editar (Only if authorized and admin) */}
      {isAdmin && canEdit && (
        <Link
          href={`/gobernanza/convocatorias/${id}/editar`}
          className="flex items-center gap-1.5 rounded-full border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#304854] hover:bg-[#faf8f5] transition-colors shadow-2xs"
        >
          <Edit2 className="w-3.5 h-3.5 text-[#64748b]" />
          Editar
        </Link>
      )}

      {/* 3. Enviar por correo */}
      {isAdmin && (
        <button
          type="button"
          disabled={isSending}
          onClick={handleSendByEmail}
          className="flex items-center gap-1.5 rounded-full border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#304854] hover:bg-[#faf8f5] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#304854]" />
          ) : (
            <Mail className="w-3.5 h-3.5 text-[#64748b]" />
          )}
          {isSending ? "Enviando..." : "Enviar por correo"}
        </button>
      )}

      {/* 4. Enviar por WhatsApp */}
      {isAdmin && (
        <button
          type="button"
          disabled={isSendingWA}
          onClick={handleSendByWhatsApp}
          className="flex items-center gap-1.5 rounded-full border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#304854] hover:bg-[#faf8f5] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          {isSendingWA ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#25D366]" />
          ) : (
            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
          )}
          {isSendingWA ? "Preparando..." : "Enviar por WhatsApp"}
        </button>
      )}

      {/* 5. Iniciar / Toma de asamblea */}
      {isAdmin && (
        <Link
          href={`/gobernanza/convocatorias/${id}/asamblea`}
          className="flex items-center gap-1.5 rounded-full bg-[#304854] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#23353e] transition-colors shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current text-[#d0b685]" />
          {isSessionActive
            ? `Toma de ${isReunion ? "reunión" : "asamblea"}`
            : `Iniciar ${isReunion ? "reunión" : "asamblea"}`}
        </Link>
      )}

      {/* 6. Participar en asamblea (for residents/attendees during session) */}
      {isSessionActive && activeDateId && (
        <Link
          href={`/gobernanza/convocatorias/${id}/asamblea/${activeDateId}/participar`}
          className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 transition-colors shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current text-white" />
          Participar
        </Link>
      )}

      {/* WhatsApp Dialog Modal */}
      {waRecipients && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWaRecipients(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-[#faf8f5] flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#304854] text-left">
                  Enviar Invitación por WhatsApp
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase text-left">
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
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all text-left">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-bold text-slate-900 truncate">{rec.name}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase truncate">{rec.position}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.phone}</p>
                  </div>
                  <a
                    href={`https://api.whatsapp.com/send?phone=${rec.phone}&text=${encodeURIComponent(waText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white text-[11px] font-bold rounded-lg hover:bg-[#20ba59] transition-colors shrink-0 shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Enviar
                  </a>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[#304854] hover:underline"
              >
                Compartir enlace general
              </a>
              <button
                onClick={() => setWaRecipients(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
