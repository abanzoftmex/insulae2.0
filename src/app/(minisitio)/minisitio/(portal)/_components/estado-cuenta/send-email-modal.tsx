"use client";

import { useState } from "react";
import { sendAccountStatementEmailAction } from "@/app/(minisitio)/minisitio/_actions/account";
import { blobToDataUrl, EMAIL_REGEX } from "@/app/(minisitio)/minisitio/(portal)/_lib/estado-cuenta-utils";
import { ButtonSpinner } from "./button-spinner";

interface UseStatementEmailOptions {
  /** Correo registrado del condómino (opción "Usar mi email registrado"). */
  userEmail: string | null | undefined;
  /** Genera el PDF a adjuntar; `null` si falló. */
  generatePdf: () => Promise<Blob | null>;
  propertyName: string;
  userName: string;
  /** Logo del correo; `null` usa el logo de Val'Quirico servido por esta app. */
  logoUrl: string | null;
}

/** Estado y envío del estado de cuenta por correo (modal "Enviar por Email"). */
export function useStatementEmail({ userEmail, generatePdf, propertyName, userName, logoUrl }: UseStatementEmailOptions) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState(userEmail || "");
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const openEmailModal = () => {
    // Pre-cargar el email del usuario al abrir el modal
    if (userEmail) {
      setEmailAddress(userEmail);
      setUseCustomEmail(false);
    }
    setShowEmailModal(true);
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailAddress("");
    setUseCustomEmail(false);
  };

  const sendEmailWithPDF = async () => {
    if (!emailAddress.trim()) {
      alert("Por favor ingresa una dirección de correo electrónico.");
      return;
    }

    if (!EMAIL_REGEX.test(emailAddress.trim())) {
      alert("Por favor ingresa una dirección de correo electrónico válida.");
      return;
    }

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
        logoUrl,
      });

      if (result.success) {
        alert("PDF enviado exitosamente por correo electrónico.");
        closeEmailModal();
      } else {
        throw new Error(result.message || "Error desconocido");
      }
    } catch (error) {
      console.error("Error enviando email:", error);
      alert("Error al enviar el PDF por correo electrónico. Por favor, inténtalo de nuevo.");
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
  };
}

export type StatementEmailState = ReturnType<typeof useStatementEmail>;

/** Clases de cada pantalla: la propiedad usa los colores de marca y el comercio, azul. */
const VARIANTS = {
  propiedad: {
    panel: "bg-white rounded-lg shadow-xl max-w-md w-full border-2 border-primary-light",
    header: "bg-primary-dark text-white px-6 py-4 rounded-t-lg",
    subtitle: "text-sm text-primary-light/80 mt-1",
    currentEmailBox: "bg-primary-light/10 p-4 rounded-lg border border-primary-light/30",
    radio: "h-4 w-4 text-primary-light focus:ring-primary-light border-gray-300",
    input:
      "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent",
    recipient: "font-semibold text-primary-light",
    submit:
      "px-4 py-2 text-sm font-medium text-white bg-primary-dark border border-transparent rounded-md hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center",
    note: "El PDF será generado con la misma información que se muestra en pantalla y enviado a la dirección especificada.",
  },
  arrendamiento: {
    panel: "bg-white rounded-lg shadow-xl max-w-md w-full border-2 border-blue-500",
    header: "bg-blue-600 text-white px-6 py-4 rounded-t-lg",
    subtitle: "text-sm text-blue-100 mt-1",
    currentEmailBox: "bg-blue-50 p-4 rounded-lg border border-blue-200",
    radio: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300",
    input:
      "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    recipient: "font-semibold text-blue-600",
    submit:
      "px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center",
    note: "El PDF será generado con la información del arrendamiento y enviado a la dirección especificada.",
  },
} as const;

/** Modal "Enviar Estado de Cuenta por Email" (overlay + diálogo). Se pinta solo si está abierto. */
export function SendStatementEmailModal({
  variant,
  subjectName,
  userEmail,
  state,
}: {
  variant: keyof typeof VARIANTS;
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
  } = state;
  if (!showEmailModal) return null;
  const styles = VARIANTS[variant];

  return (
    <>
      {/* Overlay oscuro */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={closeEmailModal} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={styles.panel}>
          {/* Header del modal */}
          <div className={styles.header}>
            <h3 className="text-lg font-semibold">✉️ Enviar Estado de Cuenta por Email</h3>
            <p className={styles.subtitle}>
              Se enviará el PDF del estado de cuenta de: <strong>{subjectName}</strong>
            </p>
          </div>

          {/* Contenido del modal */}
          <div className="p-6">
            <div className="space-y-4">
              {/* Opción de usar email actual */}
              {userEmail && (
                <div className={styles.currentEmailBox}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="currentEmail"
                      name="emailOption"
                      checked={!useCustomEmail}
                      onChange={() => {
                        setUseCustomEmail(false);
                        setEmailAddress(userEmail);
                      }}
                      className={styles.radio}
                      disabled={sendingEmail}
                    />
                    <label htmlFor="currentEmail" className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Usar mi email registrado</div>
                      <div className="text-sm text-gray-600">{userEmail}</div>
                    </label>
                  </div>
                </div>
              )}

              {/* Opción de usar email personalizado */}
              <div className="bg-gray-50 p-4 rounded-lg border border-line">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="radio"
                    id="customEmail"
                    name="emailOption"
                    checked={useCustomEmail}
                    onChange={() => {
                      setUseCustomEmail(true);
                      setEmailAddress("");
                    }}
                    className={styles.radio}
                    disabled={sendingEmail}
                  />
                  <label htmlFor="customEmail" className="text-sm font-medium text-gray-900">
                    Usar un email diferente
                  </label>
                </div>

                {useCustomEmail && (
                  <div>
                    <label htmlFor="customEmailInput" className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección de Correo Electrónico
                    </label>
                    <input
                      type="email"
                      id="customEmailInput"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className={styles.input}
                      disabled={sendingEmail}
                    />
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <strong>📧 Confirmación:</strong> El estado de cuenta se enviará a:{" "}
                <span className={styles.recipient}>{emailAddress || "Seleccione una opción"}</span>
              </div>

              <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <strong>📄 Nota:</strong> {styles.note}
              </div>
            </div>
          </div>

          {/* Footer del modal */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
            <button
              onClick={closeEmailModal}
              disabled={sendingEmail}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button onClick={sendEmailWithPDF} disabled={sendingEmail || !emailAddress.trim()} className={styles.submit}>
              {sendingEmail ? (
                <>
                  <ButtonSpinner className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                  Enviar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
