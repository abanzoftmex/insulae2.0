"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintButton() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      onClick={handlePrint}
      type="button"
      className="h-8 px-4 flex items-center gap-2 bg-brand-deep text-white rounded-full text-[10px] font-bold uppercase hover:bg-brand transition-all shadow-md shadow-brand-deep/25 cursor-pointer"
    >
      <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>PDF / IMPRIMIR</span>
    </button>
  );
}
