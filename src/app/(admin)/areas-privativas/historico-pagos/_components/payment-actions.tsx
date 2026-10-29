"use client";

import React, { useTransition, useState } from "react";
import { Send, Printer, Trash2 } from "lucide-react";
import { cancelPaymentAction } from "../../actions";

interface PaymentActionsProps {
  paymentId: string;
  legacyId: number | null;
  opc: string;
}

export function PaymentActions({ paymentId, legacyId, opc }: PaymentActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleSendEmail = () => {
    setEmailStatus("sending");
    setTimeout(() => {
      setEmailStatus("success");
      setTimeout(() => setEmailStatus("idle"), 3000);
    }, 1200);
  };

  const handlePrint = () => {
    if (legacyId) {
      window.open(`/imp-recibo.php?id=${legacyId}`, "_blank");
    } else {
      alert("Este pago no tiene un identificador legacy para imprimir recibo.");
    }
  };

  const handleDelete = () => {
    if (window.confirm("¿Seguro que quieres cancelar este pago? Esta acción revertirá la aplicación de cargos.")) {
      startTransition(async () => {
        try {
          await cancelPaymentAction(paymentId);
        } catch (e) {
          alert("Ha ocurrido un error al cancelar el pago.");
        }
      });
    }
  };

  // Only allow deleting payments in Commerce context (opc = "2")
  const showDelete = opc === "2";

  return (
    <div className="flex items-center gap-2.5">
      {/* Send Email */}
      <button
        onClick={handleSendEmail}
        disabled={emailStatus === "sending"}
        className={`p-1.5 rounded-full transition-colors ${
          emailStatus === "success" ? "text-green-600 bg-green-50" :
          emailStatus === "error" ? "text-red-600 bg-red-50" :
          "text-[#3a2a18]/60 hover:text-brand hover:bg-[#e9f0f9]"
        }`}
        title="Enviar por correo"
      >
        {emailStatus === "sending" ? (
          <span className="h-4 w-4 block animate-spin rounded-full border-2 border-brand border-t-transparent" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>

      {/* Print */}
      <button
        onClick={handlePrint}
        className="p-1.5 rounded-full text-[#3a2a18]/60 hover:text-brand hover:bg-[#e9f0f9] transition-colors"
        title="Imprimir recibo"
      >
        <Printer className="h-4 w-4" />
      </button>

      {/* Delete / Cancel */}
      {showDelete && (
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
          title="Eliminar pago"
        >
          {isPending ? (
            <span className="h-4 w-4 block animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      )}

      {emailStatus === "success" && (
        <span className="text-[10px] text-green-600 font-bold uppercase tracking-widest animate-in fade-in duration-200">
          Enviado
        </span>
      )}
    </div>
  );
}
