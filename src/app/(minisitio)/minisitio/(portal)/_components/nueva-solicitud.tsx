"use client";

/**
 * "Nueva solicitud": el mismo diálogo desde Solicitudes, Inicio (`?nueva=1`) y los estados de
 * cuenta. Al enviarla avisa con un toast y refresca la pantalla y el conteo de la barra lateral.
 * Lo escrito se conserva al cerrar y reabrir (el estado vive aquí, no en el diálogo).
 */
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createTicketAction } from "@/app/(minisitio)/minisitio/_actions/tickets";
import type { TicketDepartment } from "@/modules/minisitio/infrastructure/queries/tickets.queries";
import { buttonClass } from "@/components/minisitio/ui/button";
import { Dialog } from "@/components/minisitio/ui/dialog";
import { inputClass, labelClass, textareaClass } from "@/components/minisitio/ui/field";
import { toast } from "@/stores/minisitio-toast.store";

const FORM_VACIO = { id_tickets_departamentos: "", nombre: "", descripcion: "" };

export function NuevaSolicitud({
  open,
  onClose,
  departments,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  departments: TicketDepartment[];
  /** Después de crearla (la pantalla ya se está refrescando). */
  onCreated?: (id: string | null) => void;
}) {
  const router = useRouter();
  const formId = useId();
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const res = await createTicketAction(form);
      if (res.success) {
        setForm(FORM_VACIO);
        toast("Solicitud enviada");
        onClose();
        router.refresh();
        onCreated?.(res.ticket?.id ?? null);
      } else {
        setError(res.message || "No se pudo enviar la solicitud.");
      }
    } catch {
      setError("No se pudo enviar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nueva solicitud"
      description="Cuéntale a la administración qué necesitas o qué está pasando."
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass("outline")}>
            Cancelar
          </button>
          <button type="submit" form={formId} disabled={enviando} className={buttonClass("primary")}>
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4 pt-1 pb-2">
        {departments.length > 0 && (
          <div>
            <label htmlFor={`${formId}-departamento`} className={labelClass}>
              Departamento
            </label>
            <select
              id={`${formId}-departamento`}
              required
              value={form.id_tickets_departamentos}
              onChange={(e) => setForm({ ...form, id_tickets_departamentos: e.target.value })}
              className={inputClass}
            >
              <option value="">Elige a quién va dirigida</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor={`${formId}-asunto`} className={labelClass}>
            Asunto
          </label>
          <input
            id={`${formId}-asunto`}
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej. Fuga de agua frente a mi casa"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-detalle`} className={labelClass}>
            Detalle
          </label>
          <textarea
            id={`${formId}-detalle`}
            required
            rows={5}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Qué pasa, dónde y desde cuándo."
            className={textareaClass}
          />
        </div>
        {error && (
          <p role="alert" className="text-body text-overdue">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
