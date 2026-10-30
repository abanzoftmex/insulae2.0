"use client";

import { useState } from "react";
import { Calculator, Info } from "lucide-react";

/** Tooltip con la fórmula del indiviso (antes `components/IndivisoInfo.js`). */
export function IndivisoInfo({ totalM2Proyecto = 157850.23 }: { totalM2Proyecto?: number }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Info className="w-4 h-4" />
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-xs">
            <div className="flex items-center mb-2">
              <Calculator className="w-4 h-4 mr-2" />
              <span className="font-semibold">Cálculo del Indiviso</span>
            </div>
            <p className="mb-2">El indiviso se calcula con la fórmula:</p>
            <code className="block bg-gray-800 p-2 rounded text-xs mb-2">
              (M² Propiedad / {totalM2Proyecto.toLocaleString()}) × 100
            </code>
            <p className="text-xs text-gray-700">
              Donde {totalM2Proyecto.toLocaleString()} m² es el total del proyecto Insulae.
            </p>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IndivisoInfo;
