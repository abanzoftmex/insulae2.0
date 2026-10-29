"use client";

import { useRef, useState } from "react";
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
  MapPin,
  CornerDownRight,
} from "lucide-react";
import { createTicketAction, listTicketsAction, replyTicketAction } from "@/app/(minisitio)/minisitio/_actions/tickets";
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

// Descarga un archivo a través del proxy server-side (fuerza la descarga con
// Content-Disposition: attachment y evita problemas de CORS con Firebase).
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
  // State management
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
  const [allTickets, setAllTickets] = useState<TicketItem[]>(initialAllTickets); // Store all tickets for counts
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({}); // Tarjeta expandida/colapsada
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({}); // Formulario de respuesta visible
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({}); // Track replies for each ticket
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({}); // Track submission state
  // Solo la respuesta de la última pestaña pedida actualiza la lista.
  const lastTicketsRequest = useRef(0);

  // Form state
  const [formData, setFormData] = useState({
    id_tickets_departamentos: "",
    nombre: "",
    descripcion: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const data = await createTicketAction({
        ...formData,
      });

      if (data.success) {
        setMessage(
          "Solicitud creada exitosamente. Se ha enviado una notificación al departamento correspondiente."
        );
        setFormData({
          id_tickets_departamentos: "",
          nombre: "",
          descripcion: "",
        });
        setShowCreateForm(false);

        // Recargar todos los tickets (contadores) y los de la pestaña actual
        loadTickets(activeTab, true);

        // Clear message after 5 seconds
        setTimeout(() => setMessage(""), 5000);
      } else {
        setError(data.message || "Error al crear la solicitud");
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
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

  const handleSubmitReply = async (ticketId: string) => {
    const replyText = ticketReplies[ticketId];

    if (!replyText || !replyText.trim()) {
      alert("Por favor escribe una respuesta");
      return;
    }

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

        alert("Respuesta enviada exitosamente");
      } else {
        alert(data.message || "Error al enviar la respuesta");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Error de conexión. Intenta nuevamente.");
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

  const getStatusColor = (statusId: number) => {
    return statusId === 1
      ? "bg-yellow-100 text-yellow-800"
      : "bg-green-100 text-green-800";
  };

  const getStatusIcon = (statusId: number) => {
    return statusId === 1 ? (
      <AlertCircle className="w-4 h-4" />
    ) : (
      <CheckCircle className="w-4 h-4" />
    );
  };

  return (
    <div className="min-h-screen bg-canvas p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-[#cba258] to-[#cba258] rounded-xl flex items-center justify-center shadow-lg">
              <TicketIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Solicitudes y reportes
              </h1>
              <p className="text-gray-600">
                Gestiona tus solicitudes de soporte y seguimiento de incidencias
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-[#cba258] to-[#cba258] hover:from-[#bca065] hover:to-[#bca065] text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Solicitud</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 inline-flex">
          <button
            onClick={() => handleTabChange("open")}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
              activeTab === "open"
                ? "bg-gradient-to-r from-[#cba258] to-[#cba258] text-white shadow-md"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Solicitudes Abiertas (
            {allTickets.filter((t) => t.id_cat_status_tickets === 1).length})
          </button>
          <button
            onClick={() => handleTabChange("closed")}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
              activeTab === "closed"
                ? "bg-gradient-to-r from-[#cba258] to-[#cba258] text-white shadow-md"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Solicitudes Cerradas (
            {allTickets.filter((t) => t.id_cat_status_tickets === 2).length})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay solicitudes{" "}
              {activeTab === "open" ? "abiertas" : "cerradas"}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === "open"
                ? "Todas tus solicitudes han sido resueltas. ¡Excelente!"
                : "No tienes solicitudes cerradas aún."}
            </p>
            {activeTab === "open" && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-[#cba258] to-[#cba258] hover:from-[#bca065] hover:to-[#bca065] text-white px-6 py-3 rounded-lg font-medium inline-flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Crear Primera Solicitud</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((ticket) => {
              const pdfSolicitud = ticket.pdf_solicitud;
              const isSolicitud = !!pdfSolicitud;
              const isOpen = !!expandedTickets[ticket.id_tickets];
              return (
                <div key={ticket.id_tickets}>
                  {/* Cabecera (clic para expandir) */}
                  <button
                    type="button"
                    onClick={() => toggleTicketExpand(ticket.id_tickets)}
                    aria-expanded={isOpen}
                    className="w-full text-left px-4 sm:px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSolicitud
                          ? "bg-[#006241]/10 text-[#006241]"
                          : "bg-[#cba258]/15 text-[#a8853f]"
                      }`}
                    >
                      {isSolicitud ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <MessageSquare className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-[15px] font-semibold text-gray-900 truncate">
                          {ticket.nombre}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${getStatusColor(
                            ticket.id_cat_status_tickets
                          )}`}
                        >
                          {getStatusIcon(ticket.id_cat_status_tickets)}
                          {ticket.status_texto}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-x-3 gap-y-1 text-xs text-gray-500 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatTicketDate(ticket.fecha)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {ticket.departamento || "Sin departamento"}
                        </span>
                        {ticket.respuesta && (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Respondido
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Detalle (expandido) */}
                  {isOpen && (
                    <div className="px-4 sm:px-6 pb-5 space-y-4">
                      {cleanDescripcion(ticket.descripcion) && (
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                            {cleanDescripcion(ticket.descripcion)}
                          </p>
                        </div>
                      )}

                      {/* Documentos de la solicitud */}
                      {pdfSolicitud && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                            Documentos
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={pdfSolicitud}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-[#006241] hover:bg-[#00754A] text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              Ver PDF
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                descargarArchivo(pdfSolicitud, `${ticket.nombre || "solicitud"}.pdf`)
                              }
                              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Descargar
                            </button>
                            {ticket.imagen_solicitud && (
                              <a
                                href={ticket.imagen_solicitud}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                              >
                                <MapPin className="w-4 h-4" />
                                Ubicación
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Respuesta de Insulae */}
                      {ticket.respuesta && (
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                          <h4 className="text-sm font-semibold text-blue-900 mb-1.5 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Respuesta de Insulae
                          </h4>
                          <p className="text-sm text-blue-800 whitespace-pre-wrap">
                            {ticket.respuesta}
                          </p>
                          {(ticket.pdf_respuesta || ticket.imagen_respuesta) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {ticket.pdf_respuesta && (
                                <a
                                  href={ticket.pdf_respuesta}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  Ver PDF
                                </a>
                              )}
                              {ticket.imagen_respuesta && (
                                <a
                                  href={ticket.imagen_respuesta}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                  Ver imagen
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tu respuesta anterior */}
                      {ticket.respuesta_usuario && (
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                            <CornerDownRight className="w-4 h-4" />
                            Tu respuesta
                            {formatReplyDate(ticket.fecha_respuesta_usuario) && (
                              <span className="font-normal text-gray-400">
                                · {formatReplyDate(ticket.fecha_respuesta_usuario)}
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {ticket.respuesta_usuario}
                          </p>
                        </div>
                      )}

                      {/* Responder (solo en abiertas) */}
                      {activeTab === "open" &&
                        (replyOpen[ticket.id_tickets] ? (
                          <div className="rounded-xl border border-gray-200 p-4">
                            <textarea
                              value={ticketReplies[ticket.id_tickets] || ""}
                              onChange={(e) =>
                                handleReplyChange(ticket.id_tickets, e.target.value)
                              }
                              placeholder="Escribe tu respuesta…"
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006241]/30 focus:border-[#006241] resize-none"
                            />
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => handleSubmitReply(ticket.id_tickets)}
                                disabled={submittingReply[ticket.id_tickets]}
                                className="inline-flex items-center gap-2 bg-[#006241] hover:bg-[#00754A] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {submittingReply[ticket.id_tickets] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Enviando…
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4" />
                                    Enviar respuesta
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => toggleReply(ticket.id_tickets)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleReply(ticket.id_tickets)}
                            className="inline-flex items-center gap-2 text-[#006241] hover:text-[#00754A] font-medium text-sm transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Responder
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#cba258] to-[#cba258] p-6 text-white text-center">
              <button
                onClick={() => setShowCreateForm(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl mb-4">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">Crear Nueva Solicitud</h3>
              <p className="text-white/80 text-sm mt-1">
                Reporta una incidencia o solicita soporte técnico
              </p>
            </div>

            {/* Form */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="departamento"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Departamento *
                  </label>
                  <select
                    id="departamento"
                    value={formData.id_tickets_departamentos}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        id_tickets_departamentos: e.target.value,
                      })
                    }
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cba258] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    required
                  >
                    <option value="">Selecciona un departamento</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="nombre"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Asunto *
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cba258] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="Breve descripción del problema"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="descripcion"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Descripción *
                  </label>
                  <textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cba258] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                    placeholder="Describe detalladamente tu solicitud de soporte..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-[#cba258] to-[#cba258] hover:from-[#bca065] hover:to-[#bca065] text-white font-semibold py-4 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creando solicitud...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <Send className="w-5 h-5" />
                      <span>Crear Solicitud</span>
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
