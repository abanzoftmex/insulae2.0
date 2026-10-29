"use client";

import React from "react";

export function YearSelector({ currentYear, selectedYear }: { currentYear: number, selectedYear: number }) {
  return (
    <form method="GET" className="flex items-center">
      <select 
        name="anio" 
        defaultValue={selectedYear}
        onChange={(e) => e.target.form?.submit()}
        className="h-8 rounded-md border border-line bg-card px-2 text-[13px] font-bold text-brand outline-none appearance-none focus:ring-2 focus:ring-brand-accent/30 cursor-pointer"
      >
        {[currentYear-1, currentYear, currentYear+1, currentYear+2].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button type="submit" className="hidden">Buscar</button>
    </form>
  );
}
