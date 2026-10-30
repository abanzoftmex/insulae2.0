"use client";

import { useState } from "react";
import { sendAccountStatementEmailAction } from "@/app/(minisitio)/minisitio/_actions/account";
import { blobToDataUrl, EMAIL_REGEX } from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import { AlertCircle, Loader2, Mail, Send } from "lucide-react";
import { BUTTON } from "@/components/minisitio/ui/list-controls";
import { FIELD, LABEL, Modal, Toast } from "@/components/minisitio/ui/modal";

interface UseStatementEmailOptions {
  /** Correo registrado del condómino (opción "Usar mi email registrado"). */
  userEmail: string | null | undefined;
  /** Genera el PDF a adjuntar; `null` si falló. */
  generatePdf: () => Promise<Blob | null>;
  propertyName: string;
  userName: string;
}

/** Estado y envío del estado de cuenta por correo (modal "Enviar por Email"). */
export function useStatementEmail({ userEmail, generatePdf, propertyName, userName }: UseStatementEmailOptions) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState(userEmail || "");
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  // Antes eran alert(): el error se muestra dentro del modal y el éxito en un aviso.
  const [formError, setFormError] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  const openEmailModal = () => {
    // Pre-cargar el email del usuario al abrir el modal
    if (userEmail) {
      setEmailAddress(userEmail);
      setUseCustomEmail(false);
    }
    setFormError("");
    setShowEmailModal(true);
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailAddress("");
    setUseCustomEmail(false);
    setFormError("");
  };

  const sendEmailWithPDF = async () => {
    if (!emailAddress.trim()) {
      setFormError("Por favor ingresa una dirección de correo electrónico.");
      return;
    }

    if (!EMAIL_REGEX.test(emailAddress.trim())) {
      setFormError("Por favor ingresa una dirección de correo electrónico válida.");
      return;
    }

    setFormError("");
    setSendingEmail(true);

    try {
      // Generar el PDF primero
      const pdfBlob = await generatePdf();
      if (!pdfBlob) {
        throw new Error("Error al generar el PDF");
      }

      const pdfBase64 = await blobToDataUrl(pdfBlob);

      const result = await sendAccountStatementEmailAction({
        email: emailAddress.trim(),
        propertyName,
        userName,
        pdfData: pdfBase64,
      });

      if (result.success) {
        const destino = emailAddress.trim();
        closeEmailModal();
        setSentMessage(`PDF enviado exitosamente a ${destino}.`);
        setTimeout(() => setSentMessage(""), 5000);
      } else {
        throw new Error(result.message || "Error desconocido");
      }
    } catch (error) {
      console.error("Error enviando email:", error);
      setFormError("Error al enviar el PDF por correo electrónico. Por favor, inténtalo de nuevo.");
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
    openEmailModal,
    closeEmailModal,
    sendEmailWithPDF,
    formError,
    setFormError,
    sentMessage,
    setSentMessage,
  };
}

export type StatementEmailState = ReturnType<typeof useStatementEmail>;

/** Nota de cada pantalla. Antes el comercio usaba azul; ahora ambas van con la marca. */
const NOTES = {
  propiedad: "El PDF será generado con la misma información que se muestra en pantalla y enviado a la dirección especificada.",
  arrendamiento: "El PDF será generado con la información del arrendamiento y enviado a la dirección especificada.",
} as const;

/** Opción seleccionable (tarjeta con radio). */
function OptionCard({
  id,
  checked,
  onSelect,
  disabled,
  title,
  detail,
  children,
}: {
  id: string;
  checked: boolean;
  onSelect: () => void;
  disabled: boolean;
  title: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-[border-color,background-color,box-shadow] duration-150 ${
        checked ? "border-brand/40 bg-brand/[0.04] shadow-[0_0_0_3px_rgb(93_91_53/0.08)]" : "border-stroke-2 hover:border-stroke"
      }`}
    >
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          type="radio"
          id={id}
          name="emailOption"
          checked={checked}
          onChange={onSelect}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
        />
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-fg">{title}</span>
          {detail && <span className="block truncate text-[13px] text-fg-3">{detail}</span>}
        </span>
      </label>
      {children}
    </div>
  );
}

/** Modal "Enviar Estado de Cuenta por Email". */
export function SendStatementEmailModal({
  variant,
  subjectName,
  userEmail,
  state,
}: {
  variant: keyof typeof NOTES;
  /** Nombre de la propiedad o del comercio que aparece en el encabezado. */
  subjectName: string | null | undefined;
  userEmail: string | null | undefined;
  state: StatementEmailState;
}) {
  const {
    showEmailModal,
    emailAddress,
    setEmailAddress,
    useCustomEmail,
    setUseCustomEmail,
    sendingEmail,
    closeEmailModal,
    sendEmailWithPDF,
    formError,
    setFormError,
    sentMessage,
    setSentMessage,
  } = state;

  return (
    <>
      <Toast message={sentMessage} tone="success" onClose={() => setSentMessage("")} />
      <Modal
        open={showEmailModal}
        onClose={closeEmailModal}
        title="Enviar Estado de Cuenta por Email"
        description={`Se enviará el PDF del estado de cuenta de: ${subjectName ?? ""}`}
        icon={Mail}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendEmailWithPDF();
          }}
          className="space-y-3"
        >
          {userEmail && (
            <OptionCard
              id="currentEmail"
              checked={!useCustomEmail}
              onSelect={() => {
                setUseCustomEmail(false);
                setEmailAddress(userEmail);
                setFormError("");
              }}
              disabled={sendingEmail}
              title="Usar mi email registrado"
              detail={userEmail}
            />
          )}

          <OptionCard
            id="customEmail"
            checked={useCustomEmail}
            onSelect={() => {
              setUseCustomEmail(true);
              setEmailAddress("");
              setFormError("");
            }}
            disabled={sendingEmail}
            title="Usar un email diferente"
          >
            {useCustomEmail && (
              <div className="mt-3 pl-7">
                <label htmlFor="customEmailInput" className={LABEL}>
                  Dirección de Correo Electrónico
                </label>
                <input
                  type="email"
                  id="customEmailInput"
                  value={emailAddress}
                  onChange={(e) => {
                    setEmailAddress(e.target.value);
                    if (formError) setFormError("");
                  }}
                  placeholder="ejemplo@correo.com"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={Boolean(formError) || undefined}
                  aria-describedby={formError ? "email-error" : undefined}
                  className={`${FIELD} ${formError ? "border-overdue/50 focus:border-overdue/60 focus:ring-overdue/15" : ""}`}
                  disabled={sendingEmail}
                />
              </div>
            )}
          </OptionCard>

          {formError && (
            <p id="email-error" role="alert" className="flex items-start gap-2 rounded-lg bg-critical-bg px-3 py-2.5 text-[13px] text-overdue">
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              {formError}
            </p>
          )}

          <div className="space-y-1.5 rounded-xl bg-surface-2 px-4 py-3 text-[13px] leading-5 text-fg-3 ring-1 ring-inset ring-stroke-3">
            <p>
              El estado de cuenta se enviará a:{" "}
              <span className={emailAddress ? "font-semibold text-fg" : "text-fg-4"}>{emailAddress || "Seleccione una opción"}</span>
            </p>
            <p>{NOTES[variant]}</p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={closeEmailModal} disabled={sendingEmail} className={BUTTON.secondary}>
              Cancelar
            </button>
            <button type="submit" disabled={sendingEmail || !emailAddress.trim()} className={BUTTON.primary}>
              {sendingEmail ? (
                <>
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2} />
                  Enviando…
                </>
              ) : (
                <>
                  <Send aria-hidden className="h-4 w-4" strokeWidth={2} />
                  Enviar PDF
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
