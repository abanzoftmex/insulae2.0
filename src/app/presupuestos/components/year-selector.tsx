"use client";

import React from "react";

export function YearSelector({ currentYear, selectedYear }: { currentYear: number, selectedYear: number }) {
  return (
    <form method="GET" className="flex items-center gap-2">
      <label className="text-sm font-semibold text-gray-600">Año:</label>
      <select 
        name="anio" 
        defaultValue={selectedYear}
        onChange={(e) => e.target.form?.submit()}
        className="border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm py-1.5"
      >
        {[currentYear-1, currentYear, currentYear+1, currentYear+2].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button type="submit" className="hidden">Buscar</button>
    </form>
  );
}
