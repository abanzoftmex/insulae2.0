"use client";

import Link from "next/link";
import { Edit2, Play, Mail, MessageCircle, Loader2 } from "lucide-react";
import { useTransition } from "react";
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

  const handleSendByWhatsApp = () => {
    if (confirm("¿Deseas enviar esta convocatoria por WhatsApp? Se abrirá WhatsApp con el mensaje completo listo para enviar.")) {
      startSendingWATransition(async () => {
        const res = await getAnnouncementWhatsAppTextAction(id);
        if (res.success && res.text) {
          const url = `https://wa.me/${res.phone}?text=${encodeURIComponent(res.text)}`;
          window.open(url, "_blank");
        } else {
          alert(`Error al preparar mensaje de WhatsApp: ${res.error}`);
        }
      });
    }
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
    </div>
  );
}
