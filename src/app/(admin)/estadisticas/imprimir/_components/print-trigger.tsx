"use client";

import React, { useEffect, useState } from "react";
import { Printer, ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

interface PrintTriggerProps {
  condominiumName: string;
  filtersLabel: string;
}

export function PrintTrigger({ condominiumName, filtersLabel }: PrintTriggerProps) {
  const [autoPrinted, setAutoPrinted] = useState(false);

  useEffect(() => {
    // Breve pausa para permitir que Recharts mida el contenedor y dibuje todos los gráficos SVG
    const timer = setTimeout(() => {
      setAutoPrinted(true);
      window.print();
    }, 750);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print sticky top-0 z-50 bg-[#304854] text-white px-6 py-3 shadow-md border-b border-[#d0b685]/30 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.close();
              // Si window.close() es bloqueado por el navegador (abierto por enlace)
              window.history.back();
            } else {
              window.location.href = "/estadisticas";
            }
          }}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white/90 hover:text-white px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Estadísticas
        </button>

        <span className="text-white/40 hidden sm:inline">|</span>

        <div className="hidden sm:flex items-center gap-2 text-[12px]">
          <FileText className="w-4 h-4 text-[#d0b685]" />
          <span className="font-bold text-white">Reporte Ejecutivo PDF</span>
          <span className="text-white/60">·</span>
          <span className="text-white/80">{condominiumName}</span>
          <span className="text-white/60">({filtersLabel})</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {autoPrinted && (
          <span className="text-[11px] text-[#d0b685] font-medium hidden md:flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Diálogo de impresión activado
          </span>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[#d0b685] hover:bg-[#c2a774] text-[#1f2937] px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider shadow transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Guardar como PDF / Imprimir
        </button>
      </div>
    </div>
  );
}

