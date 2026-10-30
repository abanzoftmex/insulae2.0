"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Ticket as TicketIcon,
  Plus,
  AlertCircle,
  CheckCircle,
  Send,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Download,
  Calendar,
  Building2,
  ChevronDown,
  Loader2,
  MapPin,
  CornerDownRight,
} from "lucide-react";
import { listTicketsAction, replyTicketAction } from "@/app/(minisitio)/minisitio/_actions/tickets";
import { BUTTON, EmptyState } from "@/components/minisitio/ui/list-controls";
import { FIELD, Toast } from "@/components/minisitio/ui/modal";
import { CreateTicketModal } from "@/app/(minisitio)/minisitio/(portal)/_components/estado-cuenta/create-ticket-modal";
import type { Ticket, TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { msPath } from "@/components/minisitio/paths";

type TabKey = "open" | "closed";

/**
 * Ticket tal como lo pinta la pantalla. `pdf_solicitud` / `imagen_solicitud` (adjuntos de la
 * solicitud) los leía la pantalla vieja pero la consulta no los devuelve hoy (tampoco la API
 * anterior): el bloque "Documentos" solo aparece si algún día llegan.
 */
type TicketItem = Ticket & {
  pdf_solicitud?: string | null;
  imagen_solicitud?: string | null;
};

interface TicketsListResult {
  success: boolean;
  tickets?: TicketItem[];
  message?: string;
}

// Quita la línea con la URL cruda del PDF de descripciones antiguas
function cleanDescripcion(text: string | null | undefined) {
  if (!text) return "";
  return text
    .split("\n")
    .filter((l) => !/^\s*PDF de la solicitud\s*:/i.test(l))
    .join("\n")
    .trim();
}

// Descarga un archivo con el nombre indicado: la ruta del servidor redirige a R2 forzando
// Content-Disposition: attachment.
function descargarArchivo(url: string, filename?: string) {
  const name = filename || "documento.pdf";
  const proxied = `${msPath("/archivos/descarga")}?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
  const a = document.createElement("a");
  a.href = proxied;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Fecha del ticket. Se fija la zona horaria del condominio para que el HTML del servidor y
// el del navegador coincidan (la pantalla vieja solo se pintaba en el navegador).
function formatTicketDate(value: string | null) {
  if (!value) return "Fecha N/D";
  try {
    const d = new Date(value);
    return isNaN(d.getTime())
      ? "Fecha N/D"
      : d.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "America/Mexico_City",
        });
  } catch {
    return "Fecha N/D";
  }
}

export function TicketsView({
  initialAllTickets,
  initialTickets,
  departments,
  initialError = "",
}: {
  initialAllTickets: TicketItem[];
  initialTickets: TicketItem[];
  departments: TicketDepartment[];
  initialError?: string;
}) {
  const reduce = useReducedMotion();
  // State management
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
  const [allTickets, setAllTickets] = useState<TicketItem[]>(initialAllTickets); // Store all tickets for counts
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({}); // Tarjeta expandida/colapsada
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({}); // Formulario de respuesta visible
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({}); // Track replies for each ticket
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({}); // Track submission state
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  // Solo la respuesta de la última pestaña pedida actualiza la lista.
  const lastTicketsRequest = useRef(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);

  // Enlace directo desde el buscador global (?id=…): la solicitud se abre en su pestaña, aunque
  // ya esté cerrada, y search-hit.tsx la lleva a la vista. Se ajusta durante el render (no en un
  // efecto) para no pintar un cuadro con la pestaña equivocada.
  const targetId = useSearchParams().get("id");
  const [handledTarget, setHandledTarget] = useState<string | null>(null);
  if (targetId !== handledTarget) {
    setHandledTarget(targetId);
    const target = targetId ? allTickets.find((t) => t.id_tickets === targetId) : undefined;
    if (target) {
      setExpandedTickets((prev) => ({ ...prev, [target.id_tickets]: true }));
      const tab: TabKey = target.id_cat_status_tickets === 2 ? "closed" : "open";
      if (tab !== activeTab) {
        setActiveTab(tab);
        setTickets(allTickets.filter((t) => t.id_cat_status_tickets === (tab === "closed" ? 2 : 1)));
      }
    }
  }

  const loadTickets = async (tab: TabKey, reloadAll: boolean) => {
    const requestId = ++lastTicketsRequest.current;
    try {
      // First, load ALL tickets for counts (if not already loaded, or after creating one)
      if (reloadAll) {
        const allTicketsData: TicketsListResult = await listTicketsAction();
        if (allTicketsData.success) {
          setAllTickets(allTicketsData.tickets || []);
        }
      }

      // Then load filtered tickets for current tab
      const data: TicketsListResult = await listTicketsAction(tab);
      if (requestId !== lastTicketsRequest.current) return;

      if (data.success) {
        setTickets(data.tickets || []);
      } else {
        setError(data.message || "Error al cargar los tickets");
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
      setError("Error de conexión al cargar los tickets");
    }
  };

  // Antes la recarga colgaba de un useEffect sobre activeTab: solo corre si la pestaña cambia.
  const handleTabChange = (tab: TabKey) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    loadTickets(tab, allTickets.length === 0);
  };

  // Alta desde el modal compartido: recarga los contadores y la pestaña actual.
  const handleCreated = () => {
    setMessage("Solicitud creada exitosamente. Se ha enviado una notificación al departamento correspondiente.");
    loadTickets(activeTab, true);
    setTimeout(() => setMessage(""), 5000);
  };

  const toggleTicketExpand = (ticketId: string) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  const formatReplyDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      // Validar que sea una fecha válida
      if (isNaN(date.getTime())) {
        return "";
      }
      return date.toLocaleString("es-ES");
    } catch {
      return "";
    }
  };

  // Antes eran alert(): el error se muestra bajo el campo y el éxito en un aviso.
  const handleSubmitReply = async (ticketId: string) => {
    const replyText = ticketReplies[ticketId];

    if (!replyText || !replyText.trim()) {
      setReplyErrors((prev) => ({ ...prev, [ticketId]: "Por favor escribe una respuesta" }));
      return;
    }

    setReplyErrors((prev) => ({ ...prev, [ticketId]: "" }));
    setSubmittingReply((prev) => ({
      ...prev,
      [ticketId]: true,
    }));

    try {
      const data = await replyTicketAction(ticketId, replyText);

      if (data.success) {
        // Obtener la fecha actual
        const now = new Date().toISOString();

        // Actualizar el ticket con la nueva respuesta
        setTickets((prevTickets) =>
          prevTickets.map((t) =>
            t.id_tickets === ticketId
              ? {
                  ...t,
                  respuesta_usuario: replyText,
                  fecha_respuesta_usuario: now,
                }
              : t
          )
        );

        // Limpiar el campo de respuesta
        setTicketReplies((prev) => ({
          ...prev,
          [ticketId]: "",
        }));
        setReplyOpen((prev) => ({ ...prev, [ticketId]: false }));
        setMessage("Respuesta enviada exitosamente");
        setTimeout(() => setMessage(""), 4000);
      } else {
        setReplyErrors((prev) => ({ ...prev, [ticketId]: data.message || "Error al enviar la respuesta" }));
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      setReplyErrors((prev) => ({ ...prev, [ticketId]: "Error de conexión. Intenta nuevamente." }));
    } finally {
      setSubmittingReply((prev) => ({
        ...prev,
        [ticketId]: false,
      }));
    }
  };

  const handleReplyChange = (ticketId: string, value: string) => {
    setTicketReplies((prev) => ({
      ...prev,
      [ticketId]: value,
    }));
  };

  const toggleReply = (ticketId: string) => {
    setReplyOpen((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  const abiertas = allTickets.filter((t) => t.id_cat_status_tickets === 1).length;
  const cerradas = allTickets.filter((t) => t.id_cat_status_tickets === 2).length;
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "open", label: "Solicitudes Abiertas", count: abiertas },
    { key: "closed", label: "Solicitudes Cerradas", count: cerradas },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-mint shadow-[0_1px_2px_rgb(61_60_34/0.25)]">
            <TicketIcon aria-hidden className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[24px] font-bold leading-8 tracking-[-0.02em] text-fg">Solicitudes y reportes</h2>
            <p className="text-[14px] leading-5 text-fg-3">Gestiona tus solicitudes de soporte y seguimiento de incidencias</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-warning px-4 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgb(0_0_0/0.12)] outline-none transition-colors duration-150 hover:bg-[#755720] focus-visible:ring-2 focus-visible:ring-brand-accent/50 focus-visible:ring-offset-2"
        >
          <Plus aria-hidden className="h-4 w-4" strokeWidth={2.25} />
          Nueva Solicitud
        </button>
      </div>

      <Toast message={message} tone="success" onClose={() => setMessage("")} />

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-critical-bg px-4 py-3 text-[13.5px] text-overdue">
          <AlertCircle aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}

      {/* Pestañas */}
      <div role="tablist" aria-label="Estado de las solicitudes" className="inline-flex rounded-xl bg-surface-4 p-1 ring-1 ring-inset ring-stroke-3">
        {tabs.map(({ key, label, count }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleTabChange(key)}
              className={`relative flex h-9 items-center gap-2 rounded-lg px-4 text-[13.5px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/45 ${
                active ? "text-brand-deep" : "text-fg-3 hover:text-fg"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="tickets-tab"
                  aria-hidden
                  className="absolute inset-0 bg-card"
                  style={{ borderRadius: 8, boxShadow: "0 1px 2px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(0 0 0 / 0.04)" }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42, mass: 0.9 }}
                />
              )}
              <span className="relative">{label}</span>
              <span
                className={`relative rounded-full px-1.5 text-[12px] font-semibold tabular-nums ${
                  active ? "bg-brand text-white" : "bg-card text-fg-3"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista de solicitudes */}
      {tickets.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={`No hay solicitudes ${activeTab === "open" ? "abiertas" : "cerradas"}`}
          description={
            activeTab === "open" ? "Todas tus solicitudes han sido resueltas. ¡Excelente!" : "No tienes solicitudes cerradas aún."
          }
          action={
            activeTab === "open" ? (
              <button type="button" onClick={() => setShowCreateForm(true)} className={BUTTON.primary}>
                <Plus aria-hidden className="h-4 w-4" strokeWidth={2.25} />
                Crear Primera Solicitud
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-stroke-3 overflow-hidden rounded-2xl border border-stroke-2 bg-card">
          {tickets.map((ticket) => {
            const pdfSolicitud = ticket.pdf_solicitud;
            const isSolicitud = !!pdfSolicitud;
            const isOpen = !!expandedTickets[ticket.id_tickets];
            const abierta = ticket.id_cat_status_tickets === 1;
            const descripcion = cleanDescripcion(ticket.descripcion);
            const detailId = `ticket-${ticket.id_tickets}`;
            return (
              <li key={ticket.id_tickets} data-search-id={ticket.id_tickets} className="scroll-mt-24">
                {/* Cabecera (clic para expandir) */}
                <button
                  type="button"
                  onClick={() => toggleTicketExpand(ticket.id_tickets)}
                  aria-expanded={isOpen}
                  aria-controls={detailId}
                  className="group flex w-full items-center gap-4 px-4 py-4 text-left outline-none transition-colors duration-100 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/45 sm:px-6"
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isSolicitud ? "bg-brand/[0.08] text-brand" : "bg-gold-soft text-warning ring-1 ring-inset ring-brand-accent/20"
                    }`}
                  >
                    {isSolicitud ? (
                      <FileText aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                    ) : (
                      <MessageSquare aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold leading-5 text-fg">{ticket.nombre}</span>
                      <span
                        className={`inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-medium ring-1 ring-inset ${
                          abierta ? "bg-warning-bg text-warning ring-brand-accent/25" : "bg-success-bg text-success ring-success/15"
                        }`}
                      >
                        {abierta ? <AlertCircle aria-hidden className="h-3.5 w-3.5" /> : <CheckCircle aria-hidden className="h-3.5 w-3.5" />}
                        {ticket.status_texto}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar aria-hidden className="h-3.5 w-3.5" />
                        {formatTicketDate(ticket.fecha)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 aria-hidden className="h-3.5 w-3.5" />
                        {ticket.departamento || "Sin departamento"}
                      </span>
                      {ticket.respuesta && (
                        <span className="inline-flex items-center gap-1 font-medium text-brand">
                          <CheckCircle aria-hidden className="h-3.5 w-3.5" />
                          Respondido
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={`h-5 w-5 shrink-0 text-fg-4 transition-transform duration-[260ms] ease-smooth group-hover:text-fg-3 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Detalle: se despliega con su alto real (grid 0fr → 1fr). Cerrado es `inert`. */}
                <div id={detailId} className="submenu-collapsible" data-open={isOpen ? "true" : "false"} inert={!isOpen}>
                  <div>
                    <div className="space-y-4 px-4 pb-5 sm:px-6 sm:pl-[80px]">
                      {descripcion && (
                        <p className="whitespace-pre-line rounded-xl bg-surface-2 p-4 text-[14px] leading-6 text-fg-2 ring-1 ring-inset ring-stroke-3">
                          {descripcion}
                        </p>
                      )}

                      {/* Documentos de la solicitud */}
                      {pdfSolicitud && (
                        <div>
                          <p className="mb-2 text-[12px] font-semibold text-fg-3">Documentos</p>
                          <div className="flex flex-wrap gap-2">
                            <a href={pdfSolicitud} target="_blank" rel="noopener noreferrer" className={BUTTON.primary}>
                              <FileText aria-hidden className="h-4 w-4" strokeWidth={2} />
                              Ver PDF
                            </a>
                            <button
                              type="button"
                              onClick={() => descargarArchivo(pdfSolicitud, `${ticket.nombre || "solicitud"}.pdf`)}
                              className={BUTTON.secondary}
                            >
                              <Download aria-hidden className="h-4 w-4" strokeWidth={2} />
                              Descargar
                            </button>
                            {ticket.imagen_solicitud && (
                              <a href={ticket.imagen_solicitud} target="_blank" rel="noopener noreferrer" className={BUTTON.secondary}>
                                <MapPin aria-hidden className="h-4 w-4" strokeWidth={2} />
                                Ubicación
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Respuesta de Insulae */}
                      {ticket.respuesta && (
                        <div className="rounded-xl bg-brand/[0.05] p-4 ring-1 ring-inset ring-brand/15">
                          <h4 className="mb-1.5 flex items-center gap-2 text-[13.5px] font-semibold text-brand-deep">
                            <MessageSquare aria-hidden className="h-4 w-4" strokeWidth={2} />
                            Respuesta de Insulae
                          </h4>
                          <p className="whitespace-pre-wrap text-[14px] leading-6 text-fg-2">{ticket.respuesta}</p>
                          {(ticket.pdf_respuesta || ticket.imagen_respuesta) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {ticket.pdf_respuesta && (
                                <a href={ticket.pdf_respuesta} target="_blank" rel="noopener noreferrer" className={BUTTON.secondary}>
                                  <FileText aria-hidden className="h-4 w-4" strokeWidth={2} />
                                  Ver PDF
                                </a>
                              )}
                              {ticket.imagen_respuesta && (
                                <a href={ticket.imagen_respuesta} target="_blank" rel="noopener noreferrer" className={BUTTON.secondary}>
                                  <ImageIcon aria-hidden className="h-4 w-4" strokeWidth={2} />
                                  Ver imagen
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tu respuesta anterior */}
                      {ticket.respuesta_usuario && (
                        <div className="rounded-xl bg-surface-2 p-4 ring-1 ring-inset ring-stroke-3">
                          <h4 className="mb-1.5 flex flex-wrap items-center gap-x-2 text-[13.5px] font-semibold text-fg-2">
                            <CornerDownRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                            Tu respuesta
                            {formatReplyDate(ticket.fecha_respuesta_usuario) && (
                              <span className="font-normal text-fg-4">· {formatReplyDate(ticket.fecha_respuesta_usuario)}</span>
                            )}
                          </h4>
                          <p className="whitespace-pre-wrap text-[14px] leading-6 text-fg-2">{ticket.respuesta_usuario}</p>
                        </div>
                      )}

                      {/* Responder (solo en abiertas) */}
                      {activeTab === "open" &&
                        (replyOpen[ticket.id_tickets] ? (
                          <div className="animate-rise-in rounded-xl border border-stroke-2 p-4">
                            <label htmlFor={`reply-${ticket.id_tickets}`} className="sr-only">
                              Tu respuesta
                            </label>
                            <textarea
                              id={`reply-${ticket.id_tickets}`}
                              value={ticketReplies[ticket.id_tickets] || ""}
                              onChange={(e) => handleReplyChange(ticket.id_tickets, e.target.value)}
                              placeholder="Escribe tu respuesta…"
                              rows={3}
                              autoFocus
                              aria-invalid={Boolean(replyErrors[ticket.id_tickets]) || undefined}
                              className={`${FIELD} resize-none leading-5`}
                            />
                            {replyErrors[ticket.id_tickets] && (
                              <p role="alert" className="mt-2 text-[13px] text-overdue">
                                {replyErrors[ticket.id_tickets]}
                              </p>
                            )}
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSubmitReply(ticket.id_tickets)}
                                disabled={submittingReply[ticket.id_tickets]}
                                className={BUTTON.primary}
                              >
                                {submittingReply[ticket.id_tickets] ? (
                                  <>
                                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
                                    Enviando…
                                  </>
                                ) : (
                                  <>
                                    <Send aria-hidden className="h-4 w-4" strokeWidth={2} />
                                    Enviar respuesta
                                  </>
                                )}
                              </button>
                              <button type="button" onClick={() => toggleReply(ticket.id_tickets)} className={BUTTON.secondary}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleReply(ticket.id_tickets)}
                            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 -ml-2 text-[13.5px] font-semibold text-brand outline-none transition-colors duration-150 hover:bg-brand/[0.06] hover:text-brand-deep focus-visible:ring-2 focus-visible:ring-brand/45"
                          >
                            <MessageSquare aria-hidden className="h-4 w-4" strokeWidth={2} />
                            Responder
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Alta de solicitud: el mismo modal que "Solicitar ayuda" de los estados de cuenta. */}
      <CreateTicketModal
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        departments={departments}
        title="Crear Nueva Solicitud"
        onCreated={handleCreated}
      />
    </div>
  );
}
