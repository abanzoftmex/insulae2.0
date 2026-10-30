"use client";

import { useState } from "react";
import { LifeBuoy, Loader2, Send } from "lucide-react";
import { FIELD, LABEL, Modal, Toast } from "@/components/minisitio/ui/modal";
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
  title = "Solicitar ayuda",
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  departments: TicketDepartment[];
  /** "Solicitar ayuda" en los estados de cuenta; "Crear Nueva Solicitud" en Solicitudes. */
  title?: string;
  /** Tras crear la solicitud (p. ej. para recargar la lista). */
  onCreated?: () => void;
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
        onCreated?.();

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
      {/* Avisos de éxito o error al crear la solicitud */}
      <Toast message={message} tone="success" onClose={() => setMessage("")} />
      <Toast message={ticketError} tone="error" onClose={() => setTicketError("")} />

      <Modal
        open={open}
        onClose={onClose}
        title={title}
        description="Reporta una incidencia o solicita soporte técnico"
        icon={LifeBuoy}
        tone="gold"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="departamento" className={LABEL}>
              Departamento <span className="text-overdue">*</span>
            </label>
            <select
              id="departamento"
              value={formData.id_tickets_departamentos}
              onChange={(e) => setFormData({ ...formData, id_tickets_departamentos: e.target.value })}
              className={FIELD}
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
            <label htmlFor="nombre" className={LABEL}>
              Asunto <span className="text-overdue">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className={FIELD}
              placeholder="Breve descripción del problema"
              required
            />
          </div>
          <div>
            <label htmlFor="descripcion" className={LABEL}>
              Descripción <span className="text-overdue">*</span>
            </label>
            <textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={4}
              className={`${FIELD} resize-none leading-5`}
              placeholder="Describe detalladamente tu solicitud de soporte…"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-warning text-[14px] font-semibold text-white outline-none transition-colors duration-150 hover:bg-[#755720] focus-visible:ring-2 focus-visible:ring-brand-accent/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
                Creando solicitud…
              </>
            ) : (
              <>
                <Send aria-hidden className="h-4 w-4" strokeWidth={2} />
                Crear Solicitud
              </>
            )}
          </button>
        </form>
      </Modal>
    </>
  );
}
