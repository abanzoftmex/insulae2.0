"use client";

import { useId, useState } from "react";
import { Calculator, Info } from "lucide-react";

/** Explicación de la fórmula del indiviso (antes `components/IndivisoInfo.js`). Se abre al pasar
 *  el cursor o al enfocar el botón con el teclado. */
export function IndivisoInfo({ totalM2Proyecto = 157850.23 }: { totalM2Proyecto?: number }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Cómo se calcula el indiviso"
        aria-describedby={showTooltip ? id : undefined}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="flex h-5 w-5 items-center justify-center rounded-full text-fg-4 outline-none transition-colors duration-150 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/45"
      >
        <Info className="h-4 w-4" strokeWidth={2} />
      </button>

      {showTooltip && (
        <span role="tooltip" id={id} className="tooltip-pop absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2" data-side="bottom">
          <span className="block rounded-xl bg-brand-deep p-3.5 text-left text-[12.5px] leading-5 text-white shadow-[0_10px_28px_-10px_rgb(61_60_34/0.5)]">
            <span className="mb-2 flex items-center gap-2 font-semibold">
              <Calculator aria-hidden className="h-4 w-4 text-brand-mint" strokeWidth={2} />
              Cálculo del Indiviso
            </span>
            <span className="block text-white/80">El indiviso se calcula con la fórmula:</span>
            <code className="my-2 block rounded-lg bg-white/10 px-2.5 py-2 font-mono text-[12px] tabular-nums">
              (M² Propiedad / {totalM2Proyecto.toLocaleString("es-MX")}) × 100
            </code>
            <span className="block text-white/70">Donde {totalM2Proyecto.toLocaleString("es-MX")} m² es el total del proyecto Insulae.</span>
          </span>
        </span>
      )}
    </span>
  );
}

export default IndivisoInfo;
