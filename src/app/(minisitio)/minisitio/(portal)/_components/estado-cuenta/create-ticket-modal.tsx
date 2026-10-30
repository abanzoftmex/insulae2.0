"use client";

import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { createTicketAction } from "@/app/(minisitio)/minisitio/_actions/tickets";
import type { TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";

const EMPTY_FORM = {
  id_tickets_departamentos: "",
  nombre: "",
  descripcion: "",
};

/**
 * "Solicitar ayuda" desde los estados de cuenta: avisos de éxito/error y modal de alta de
 * ticket, en el mismo orden del DOM que en el minisitio. El formulario conserva lo escrito
 * al cerrar y reabrir el modal (como antes).
 */
export function CreateTicketModal({
  open,
  onClose,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  departments: TicketDepartment[];
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [ticketError, setTicketError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTicketError("");
    setMessage("");

    try {
      const data = await createTicketAction({ ...formData });

      if (data.success) {
        setMessage(
          "Solicitud creada exitosamente. Se ha enviado una notificación al departamento correspondiente.",
        );
        setFormData(EMPTY_FORM);
        onClose();

        // Clear message after 5 seconds
        setTimeout(() => setMessage(""), 5000);
      } else {
        setTicketError(data.message || "Error al crear la solicitud");
      }
    } catch {
      setTicketError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Success/Error Messages for Ticket Creation */}
      {message && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg shadow-lg z-50 flex items-center space-x-3 animate-fade-in">
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{message}</span>
        </div>
      )}

      {ticketError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-lg z-50 flex items-center space-x-3 animate-fade-in">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{ticketError}</span>
        </div>
      )}

      {/* Create Ticket Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
            <div className="bg-gradient-to-r from-[#cba258] to-[#cba258] p-6 text-white text-center">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl mb-4">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">Solicitar ayuda</h3>
              <p className="text-white/80 text-sm mt-1">Reporta una incidencia o solicita soporte técnico</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="departamento" className="block text-sm font-semibold text-gray-700 mb-2">
                    Departamento *
                  </label>
                  <select
                    id="departamento"
                    value={formData.id_tickets_departamentos}
                    onChange={(e) => setFormData({ ...formData, id_tickets_departamentos: e.target.value })}
                    className="w-full px-3 py-3 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cba258] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
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
                  <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-2">
                    Asunto *
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-3 border border-line rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cba258] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="Breve descripción del problema"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="descripcion" className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción *
                  </label>
                  <textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-3 border border-line rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cba258] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md resize-none"
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
    </>
  );
}
