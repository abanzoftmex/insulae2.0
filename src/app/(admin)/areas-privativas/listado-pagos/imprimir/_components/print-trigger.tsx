"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

interface PrintBarProps {
  returnUrl: string;
  propertyName: string;
}

export function PrintBar({ returnUrl, propertyName }: PrintBarProps) {
  useEffect(() => {
    // Wait for fonts, styles, and layout to be completely ready
    const timer = setTimeout(() => {
      window.print();
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <aside
      aria-label="Controles de impresión"
      className="print:hidden sticky top-0 z-50 bg-[#111e38]/95 backdrop-blur-md text-white py-2.5 px-6 shadow-md border-b border-white/10 flex justify-between items-center mb-6"
    >
      <Link
        href={returnUrl}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a detalle de pagos ({propertyName})</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-400 hidden sm:inline">
          Vista previa del Estado de cuenta
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-[#b8860b] hover:bg-[#a17a38] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Guardar PDF</span>
        </button>
      </div>
    </aside>
  );
}

// Backward compatibility export
export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
