"use client";

import React, { useState, useTransition } from "react";
import { FileOutput, Send, Printer, X, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import * as XLSX from "xlsx";
import { sendPrivateAreaStatementEmailAction, type SendStatementEmailResult } from "../../actions";
import type { PrivateAreaChargeLine } from "@/modules/private-area-actions/domain/private-area-action-page-data";

interface ActionBarButtonsProps {
  privateAreaId: string;
  opc: string;
  areaName: string;
  charges: PrivateAreaChargeLine[];
  recipientEmail?: string | null;
  recipientName?: string;
  configuredSenderEmail?: string | null;
}

export function ActionBarButtons({
  privateAreaId,
  opc,
  areaName,
  charges,
  recipientEmail,
  recipientName,
  configuredSenderEmail,
}: ActionBarButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [targetEmail, setTargetEmail] = useState<string>("");

  const cleanSenderEmail = configuredSenderEmail?.trim() || null;
  const hasValidSender = Boolean(cleanSenderEmail && cleanSenderEmail.includes("@"));

  const cleanTargetEmail = targetEmail.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hasValidRecipient = emailRegex.test(cleanTargetEmail);
  const isEmailModified = cleanTargetEmail !== (recipientEmail?.trim() || "");

  const canConfirmSend = hasValidRecipient && hasValidSender;

  const handleExportExcel = () => {
    // 1. Prepare data for Excel
    const data = charges.map((charge) => {
      const chargeDate =
        charge.periodYear && charge.periodMonth
          ? `${charge.periodYear}-${String(charge.periodMonth).padStart(2, "0")}-01`
          : "";
      const dueDate = charge.dueDate
        ? new Date(charge.dueDate).toISOString().split("T")[0]
        : "";

      return {
        "Tipo de Cuota": charge.chargeGroupName,
        "Concepto": charge.concept || `${charge.chargeGroupName} ${charge.periodYear}`,
        "Fecha de Cobro": chargeDate,
        "Fecha Límite": dueDate,
        "Cargo": charge.amount,
        "Abono": charge.paidAmount,
        "Saldo": charge.balanceAmount,
      };
    });

    // 2. Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial de Pagos");

    // 3. Download the file (in Insulae 2.0: opc=1 is Comercio, opc=2 is Propietario)
    const mode = opc === "1" ? "Comercio" : "Propietario";
    XLSX.writeFile(wb, `Estado_de_Cuenta_${areaName}_${mode}.xlsx`);
  };

  const handleOpenEmailDialog = () => {
    setFeedback(null);
    setTargetEmail(recipientEmail?.trim() || "");
    setIsConfirmOpen(true);
  };

  const handleCloseDialog = () => {
    if (isPending) return;
    setIsConfirmOpen(false);
    setFeedback(null);
  };

  const handleConfirmSendEmail = () => {
    if (!canConfirmSend || isPending) return;

    setFeedback(null);
    startTransition(async () => {
      try {
        const result: SendStatementEmailResult = await sendPrivateAreaStatementEmailAction(
          privateAreaId,
          opc,
          cleanTargetEmail
        );
        if (result.success) {
          setFeedback({ type: "success", text: result.message });
        } else {
          setFeedback({ type: "error", text: result.message });
        }
      } catch (err: any) {
        setFeedback({
          type: "error",
          text: err?.message || "Ocurrió un error inesperado al procesar la solicitud.",
        });
      }
    });
  };

  const handlePrint = () => {
    window.open(
      `/areas-privativas/listado-pagos/imprimir?id=${privateAreaId}&opc=${opc}`,
      "_blank"
    );
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExportExcel}
          className="bg-[#2c3e50] text-white px-3 py-2 rounded shadow-sm hover:bg-[#1a252f] transition-colors"
          title="Exportar a Excel"
        >
          <FileOutput className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleOpenEmailDialog}
          className="bg-[#2c3e50] hover:bg-[#1a252f] text-white px-3 py-2 rounded shadow-sm transition-colors"
          title="Enviar estado de cuenta por correo"
        >
          <Send className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="bg-[#2c3e50] text-white px-3 py-2 rounded shadow-sm hover:bg-[#1a252f] transition-colors"
          title="Imprimir estado de cuenta"
        >
          <Printer className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
            onClick={handleCloseDialog}
          />

          {/* Dialog Container */}
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#c8b59d] bg-[#faf6f0] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-[#3a2a18]">
            {/* Close Button */}
            <button
              type="button"
              disabled={isPending}
              onClick={handleCloseDialog}
              className="absolute right-4 top-4 rounded-full border border-[#ddd0be] bg-white/80 p-1.5 text-[#5a4838] hover:bg-[#e8ddd0] hover:text-[#2c3e50] transition-colors disabled:opacity-30"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="rounded-full bg-[#2c3e50] p-2 text-white">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2c3e50]">
                  Confirmar envío de estado de cuenta
                </h3>
                <p className="text-[11px] text-stone-600">
                  Verifique o edite el correo destinatario antes de confirmar el envío.
                </p>
              </div>
            </div>

            {/* Email Details Card */}
            <div className="mt-4 rounded-xl border border-[#ddd0be] bg-white p-4 text-[12px] space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 pb-2 border-b border-stone-100">
                <span className="font-semibold text-stone-500">Área privativa:</span>
                <span className="font-bold text-[#2c3e50] text-right">{areaName}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 pb-2 border-b border-stone-100">
                <span className="font-semibold text-stone-500">Correo remitente:</span>
                <div className="text-right">
                  {hasValidSender ? (
                    <span className="font-medium text-[#2c3e50]">{cleanSenderEmail}</span>
                  ) : (
                    <span className="inline-block rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                      No configurado
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="recipient-email-input" className="font-semibold text-stone-500">
                    Correo destinatario:
                  </label>
                  {recipientName && (
                    <span className="font-bold text-[#2c3e50] text-[12px] truncate max-w-[240px]" title={recipientName}>
                      {recipientName}
                    </span>
                  )}
                </div>

                <input
                  id="recipient-email-input"
                  type="email"
                  value={targetEmail}
                  onChange={(e) => {
                    setTargetEmail(e.target.value);
                    if (feedback?.type === "error") setFeedback(null);
                  }}
                  placeholder="ejemplo@correo.com"
                  disabled={isPending}
                  className="w-full rounded-md border border-[#ddd0be] bg-[#faf6f0]/60 px-3 py-1.5 text-[12px] font-mono text-stone-800 placeholder:text-stone-400 focus:border-[#2c3e50] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2c3e50] transition-colors disabled:opacity-50"
                />

                <div className="flex items-center justify-between text-[10.5px]">
                  {cleanTargetEmail.length === 0 ? (
                    <span className="text-amber-700">Sin correo registrado. Ingrese uno para enviar.</span>
                  ) : !hasValidRecipient ? (
                    <span className="text-red-600 font-medium">Formato de correo no válido (ej: usuario@dominio.com).</span>
                  ) : isEmailModified ? (
                    <span className="text-emerald-700 font-medium">Uso temporal para este envío (no modifica el área).</span>
                  ) : (
                    <span className="text-stone-500">Puede editar el correo para este envío puntual.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Warning when sender is missing */}
            {!hasValidSender && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                <p>
                  No existe una configuración efectiva de correo remitente institucional. El envío está deshabilitado.
                </p>
              </div>
            )}

            {/* Warning when recipient is missing */}
            {!cleanTargetEmail && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                <p>
                  El área privativa no cuenta con una dirección de correo registrada. Ingrese una en el campo superior para habilitar el envío puntual.
                </p>
              </div>
            )}

            {/* Status Feedback Banner */}
            {feedback && (
              <div
                className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-[11px] ${
                  feedback.type === "success"
                    ? "bg-green-50 border-green-200 text-green-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-700 mt-0.5" />
                )}
                <p className="font-medium">{feedback.text}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isPending}
                onClick={handleCloseDialog}
                className="rounded-lg border border-[#ddd0be] bg-white px-4 py-2 text-[12px] font-bold text-stone-700 hover:bg-[#ede3d5] transition-colors disabled:opacity-50"
              >
                {feedback?.type === "success" ? "Cerrar" : "Cancelar"}
              </button>

              <button
                type="button"
                disabled={!canConfirmSend || isPending || feedback?.type === "success"}
                onClick={handleConfirmSendEmail}
                className="flex items-center gap-1.5 rounded-lg bg-[#2c3e50] px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#1a252f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <span className="h-3.5 w-3.5 block animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Confirmar y enviar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
