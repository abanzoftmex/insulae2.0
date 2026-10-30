"use client";

/**
 * "Enviar por correo" del estado de cuenta: el diálogo compartido, con el correo registrado o
 * uno distinto. Los errores se dicen en el diálogo; el envío correcto, con un toast.
 */
import { useId, useState } from "react";
import { sendAccountStatementEmailAction } from "@/app/(minisitio)/minisitio/_actions/account";
import { blobToDataUrl, EMAIL_REGEX } from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import { buttonClass } from "@/components/minisitio/ui/button";
import { Dialog } from "@/components/minisitio/ui/dialog";
import { inputClass, labelClass } from "@/components/minisitio/ui/field";
import { toast } from "@/stores/minisitio-toast.store";

interface UseStatementEmailOptions {
  /** Correo registrado del condómino (opción "Mi correo registrado"). */
  userEmail: string | null | undefined;
  /** Genera el PDF a adjuntar; `null` si falló. */
  generatePdf: () => Promise<Blob | null>;
  propertyName: string;
  userName: string;
}

/** Estado y envío del estado de cuenta por correo. */
export function useStatementEmail({ userEmail, generatePdf, propertyName, userName }: UseStatementEmailOptions) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState(userEmail || "");
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState("");

  const openEmailModal = () => {
    setEmailAddress(userEmail || "");
    setUseCustomEmail(!userEmail);
    setError("");
    setShowEmailModal(true);
  };

  const closeEmailModal = () => {
    if (sendingEmail) return;
    setShowEmailModal(false);
    setError("");
  };

  const sendEmailWithPDF = async () => {
    const address = emailAddress.trim();
    if (!address) {
      setError("Escribe a qué correo lo enviamos.");
      return;
    }
    if (!EMAIL_REGEX.test(address)) {
      setError("Ese correo no parece válido. Revísalo.");
      return;
    }

    setSendingEmail(true);
    setError("");
    try {
      const pdfBlob = await generatePdf();
      if (!pdfBlob) throw new Error("No se pudo generar el PDF");
      const result = await sendAccountStatementEmailAction({
        email: address,
        propertyName,
        userName,
        pdfData: await blobToDataUrl(pdfBlob),
      });
      if (!result.success) throw new Error(result.message || "Error desconocido");
      toast(`Enviamos el estado de cuenta a ${address}`);
      setShowEmailModal(false);
    } catch (err) {
      console.error("[minisitio] envío del estado de cuenta:", err);
      setError("No pudimos enviarlo. Inténtalo otra vez en un momento.");
    } finally {
      setSendingEmail(false);
    }
  };

  return {
    showEmailModal,
    emailAddress,
    setEmailAddress,
    useCustomEmail,
    setUseCustomEmail,
    sendingEmail,
    error,
    openEmailModal,
    closeEmailModal,
    sendEmailWithPDF,
  };
}

export type StatementEmailState = ReturnType<typeof useStatementEmail>;

const NOTA = {
  propiedad: "El PDF lleva la misma información que ves en pantalla.",
  arrendamiento: "El PDF lleva la información del contrato de arrendamiento.",
} as const;

export function SendStatementEmailModal({
  variant,
  subjectName,
  userEmail,
  state,
}: {
  variant: keyof typeof NOTA;
  /** Nombre de la propiedad o del comercio. */
  subjectName: string | null | undefined;
  userEmail: string | null | undefined;
  state: StatementEmailState;
}) {
  const id = useId();
  const { showEmailModal, emailAddress, setEmailAddress, useCustomEmail, setUseCustomEmail, sendingEmail, error, closeEmailModal, sendEmailWithPDF } = state;
  const opcion = (activa: boolean) =>
    `flex cursor-pointer items-start gap-3 rounded-panel border p-3 transition-colors ${activa ? "border-brand bg-highlight" : "border-stroke-2 hover:bg-surface-2"}`;

  return (
    <Dialog
      open={showEmailModal}
      onClose={closeEmailModal}
      title="Enviar por correo"
      description={subjectName ? `Te mandamos el PDF del estado de cuenta de ${subjectName}.` : undefined}
      footer={
        <>
          <button type="button" onClick={closeEmailModal} disabled={sendingEmail} className={buttonClass("outline")}>
            Cancelar
          </button>
          <button type="submit" form={id} disabled={sendingEmail || !emailAddress.trim()} className={buttonClass("primary")}>
            {sendingEmail ? "Enviando…" : "Enviar PDF"}
          </button>
        </>
      }
    >
      <form
        id={id}
        onSubmit={(e) => {
          e.preventDefault();
          void sendEmailWithPDF();
        }}
        className="space-y-3 pt-1 pb-2"
      >
        <fieldset className="space-y-2" disabled={sendingEmail}>
          <legend className="sr-only">¿A qué correo?</legend>
          {userEmail && (
            <label className={opcion(!useCustomEmail)}>
              <input
                type="radio"
                name={`${id}-destino`}
                checked={!useCustomEmail}
                onChange={() => {
                  setUseCustomEmail(false);
                  setEmailAddress(userEmail);
                }}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span className="min-w-0">
                <span className="block text-body font-semibold text-fg">Mi correo registrado</span>
                <span className="block truncate text-body text-fg-3">{userEmail}</span>
              </span>
            </label>
          )}
          <label className={opcion(useCustomEmail)}>
            <input
              type="radio"
              name={`${id}-destino`}
              checked={useCustomEmail}
              onChange={() => {
                setUseCustomEmail(true);
                setEmailAddress("");
              }}
              className="mt-0.5 h-4 w-4 accent-brand"
            />
            <span className="block text-body font-semibold text-fg">Otro correo</span>
          </label>
        </fieldset>

        {useCustomEmail && (
          <div>
            <label htmlFor={`${id}-correo`} className={labelClass}>
              Correo
            </label>
            <input
              id={`${id}-correo`}
              type="email"
              autoComplete="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="nombre@correo.com"
              className={inputClass}
              disabled={sendingEmail}
            />
          </div>
        )}

        <p className="text-caption text-fg-3">{NOTA[variant]}</p>
        {error && (
          <p role="alert" className="text-body text-overdue">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
