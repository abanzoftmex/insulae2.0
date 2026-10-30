"use client";

/**
 * Aceptación del aviso de privacidad dentro del portal: aparece si el condómino no lo ha aceptado.
 * Hoy no existe campo de aceptación en la base y el login lo da por aceptado (igual que el
 * minisitio independiente), así que en la práctica no aparece; queda listo para cuando se
 * persista. No se descarta con Esc ni con un clic fuera: salir cierra la sesión, así que hay que
 * elegir una de las dos acciones. El texto llega del servidor (`notice`).
 */
import { useState } from "react";
import { acceptPrivacyNoticeAction } from "@/app/(minisitio)/minisitio/_actions/auth";
import { AvisoPrivacidadTexto } from "./aviso-privacidad-texto";
import { buttonClass } from "./ui/button";
import { Dialog } from "./ui/dialog";

const sinCierre = () => {};

export function PrivacyNoticeModal({
  open,
  notice,
  onAccept,
  onCancel,
}: {
  open: boolean;
  notice: string;
  onAccept: () => void;
  /** Cierra la sesión. */
  onCancel: () => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setAccepting(true);
    setError("");
    try {
      const data = await acceptPrivacyNoticeAction();
      if (data.success) {
        onAccept();
        return;
      }
      setError(data.message || "No pudimos registrar tu aceptación. Inténtalo otra vez.");
    } catch {
      setError("No hay conexión. Revisa tu internet e inténtalo otra vez.");
    }
    setAccepting(false);
  };

  return (
    <Dialog
      open={open}
      onClose={sinCierre}
      dismissible={false}
      title="Aviso de privacidad"
      description="Léelo y acéptalo para seguir usando el portal."
      footer={
        <>
          {error && (
            <p role="alert" className="w-full text-body text-overdue">
              {error}
            </p>
          )}
          <button type="button" onClick={onCancel} disabled={accepting} className={buttonClass("outline")}>
            Cerrar sesión
          </button>
          <button type="button" onClick={accept} disabled={accepting} className={buttonClass("primary")}>
            {accepting ? "Guardando…" : "Acepto"}
          </button>
        </>
      }
    >
      <div className="pt-1 pb-2">
        {notice ? (
          <AvisoPrivacidadTexto texto={notice} nivelSeccion={3} />
        ) : (
          <p className="text-body text-fg-2">El texto del aviso no está disponible en este momento. Puedes consultarlo con la administración.</p>
        )}
      </div>
    </Dialog>
  );
}
