"use client";

import { Grid, List } from "lucide-react";
import type { ListView } from "@/stores/minisitio.store";

export function ViewToggle({
  view,
  onViewChange,
  className = "",
}: {
  view: ListView;
  onViewChange: (view: ListView) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center bg-gray-100 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => onViewChange("table")}
        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          view === "table" ? "bg-primary-dark text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
        }`}
      >
        <List className="w-4 h-4 mr-2" />
        Tabla
      </button>
      <button
        onClick={() => onViewChange("grid")}
        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          view === "grid" ? "bg-primary-dark text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
        }`}
      >
        <Grid className="w-4 h-4 mr-2" />
        Tarjetas
      </button>
    </div>
  );
}

export default ViewToggle;
