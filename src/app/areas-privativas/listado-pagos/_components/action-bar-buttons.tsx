"use client";

import React, { useState, useTransition } from "react";
import { FileOutput, Send, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { sendPrivateAreaStatementEmailAction } from "../../actions";
import type { PrivateAreaChargeLine } from "@/modules/private-area-actions/domain/private-area-action-page-data";

interface ActionBarButtonsProps {
  privateAreaId: string;
  opc: string;
  areaName: string;
  charges: PrivateAreaChargeLine[];
}

export function ActionBarButtons({ privateAreaId, opc, areaName, charges }: ActionBarButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle");

  const handleExportExcel = () => {
    // 1. Prepare data for Excel
    const data = charges.map(charge => {
      const chargeDate = charge.periodYear && charge.periodMonth 
        ? `${charge.periodYear}-${String(charge.periodMonth).padStart(2, "0")}-01`
        : "";
      const dueDate = charge.dueDate ? new Date(charge.dueDate).toISOString().split("T")[0] : "";

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

    // 3. Download the file
    const mode = opc === "2" ? "Comercio" : "Propietario";
    XLSX.writeFile(wb, `Estado_de_Cuenta_${areaName}_${mode}.xlsx`);
  };

  const handleSendEmail = () => {
    setEmailStatus("idle");
    startTransition(async () => {
      try {
        await sendPrivateAreaStatementEmailAction(privateAreaId, opc);
        setEmailStatus("success");
        setTimeout(() => setEmailStatus("idle"), 3000);
      } catch (e) {
        setEmailStatus("error");
        setTimeout(() => setEmailStatus("idle"), 3000);
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleExportExcel}
        className="bg-[#2c3e50] text-white px-3 py-2 rounded shadow-sm hover:bg-[#1a252f] transition-colors"
        title="Exportar a Excel"
      >
        <FileOutput className="h-3.5 w-3.5" />
      </button>

      <button 
        onClick={handleSendEmail}
        disabled={isPending}
        className={`text-white px-3 py-2 rounded shadow-sm transition-colors ${
          emailStatus === "success" ? "bg-green-600 hover:bg-green-700" :
          emailStatus === "error" ? "bg-red-600 hover:bg-red-700" :
          "bg-[#2c3e50] hover:bg-[#1a252f]"
        }`}
        title="Enviar estado de cuenta por correo"
      >
        {isPending ? (
          <span className="h-3.5 w-3.5 block animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
      </button>

      <button 
        onClick={handlePrint}
        className="bg-[#2c3e50] text-white px-3 py-2 rounded shadow-sm hover:bg-[#1a252f] transition-colors"
        title="Imprimir estado de cuenta"
      >
        <Printer className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
