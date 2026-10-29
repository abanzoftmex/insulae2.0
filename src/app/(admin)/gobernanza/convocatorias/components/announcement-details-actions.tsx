"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Edit2, Play, Mail, MessageCircle, Loader2, X } from "lucide-react";
import { sendAnnouncementInvitationAction, getAnnouncementWhatsAppTextAction } from "../[id]/asamblea/actions";

const WHATSAPP_NUMBER = "5212212721794";

interface AnnouncementDetailsActionsProps {
  id: string;
  name?: string;
  pdfUrl?: string | null;
  isAdmin?: boolean;
  activeDateId?: string;
  statusName?: string;
  isReunion?: boolean;
}

export function AnnouncementDetailsActions({
  id,
  name = "",
  pdfUrl,
  isAdmin = false,
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
          alert(`Convocatoria enviada con éxito.\nTotal de correos enviados: ${res.sentCount}.\nFallidos: ${res.failedCount}.`);
        } else {
          alert(`Error al enviar correos: ${res.error}`);
        }
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {isAdmin && (
        <>
          <Link
            href={`/gobernanza/convocatorias/${id}/editar`}
            className="flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors"
          >
            <Edit2 className="h-3 w-3" />
            Editar convocatoria
          </Link>

          <Link
            href={`/gobernanza/convocatorias/${id}/asamblea`}
            className="flex items-center gap-2 h-9 px-5 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors active-scale"
          >
            <Play className="h-3 w-3 fill-current" />
            Iniciar asamblea
          </Link>

          <button
            type="button"
            disabled={isSending}
            onClick={handleSendByEmail}
            className="flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="h-3 w-3 animate-spin text-brand" />
            ) : (
              <Mail className="h-3 w-3" />
            )}
            {isSending ? "Enviando..." : "Enviar por correo"}
          </button>

          <button
            type="button"
            disabled={isSendingWA}
            onClick={handleSendByWhatsApp}
            className="flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-line text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-canvas transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSendingWA ? (
              <Loader2 className="h-3 w-3 animate-spin text-[#25D366]" />
            ) : (
              <MessageCircle className="h-3 w-3 text-[#25D366]" />
            )}
            {isSendingWA ? "Preparando..." : "Enviar por WhatsApp"}
          </button>
        </>
      )}

      {!isAdmin && (statusName === "En Proceso" || statusName === "Iniciada") && activeDateId && (
        <Link
          href={`/gobernanza/convocatorias/${id}/asamblea/${activeDateId}/participar`}
          className="flex items-center gap-2 h-9 px-5 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors active-scale"
        >
          <Play className="h-3 w-3 fill-current" />
          Participar en {isReunion ? "reunión" : "asamblea"}
        </Link>
      )}
      {waRecipients && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWaRecipients(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#2f221a] text-left">
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
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/30 transition-all text-left">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-bold text-slate-800 truncate text-left">{rec.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 truncate text-left">{rec.position}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 text-left">{rec.phone}</p>
                  </div>
                  <a
                    href={`https://api.whatsapp.com/send?phone=${rec.phone}&text=${encodeURIComponent(waText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setWaRecipients(null)}
                    className="h-8 px-3 rounded-full bg-[#25D366] hover:bg-[#20ba56] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
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
    </div>
  );
}
