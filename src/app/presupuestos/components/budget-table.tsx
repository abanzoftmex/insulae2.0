"use client";

import React, { useState } from "react";
import { BudgetVM } from "@/modules/budget";
import { updateBudgetAmountAction, createBudgetAmountAction } from "../actions";

function formatMXN(num: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(num);
}

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const groupTitles: Record<string, string> = {
  ADMINISTRATION: "Gastos de administración",
  MAINTENANCE: "Gastos de mantenimiento",
  SECURITY: "Gastos de seguridad",
  INFRASTRUCTURE: "Gastos de infraestructura",
  EXTRAORDINARY: "Gastos extraordinarios",
  OTHER: "Otros"
};

export default function BudgetTable({ vm }: { vm: BudgetVM }) {
  const isClosed = vm.status === "CLOSED";

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>, conceptId: string, month: number, monthId?: string) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) val = 0;

    const original = parseFloat(e.target.dataset.original || "0");
    if (val === original) return;

    if (monthId) {
      await updateBudgetAmountAction(vm.year, monthId, val);
    } else {
      if (!vm.id) return; // Si no hay presupuesto creado y el blur lanza update, deberia crearse primero
      await createBudgetAmountAction(vm.year, vm.id, conceptId, month, val);
    }
    // Optimistically updating dataset prevents re-triggering
    e.target.dataset.original = val.toString();
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm mt-4 custom-scrollbar">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-[#5c7a6b] text-white sticky top-0 z-20">
          <tr>
            <th className="px-4 py-3 sticky left-0 z-30 bg-[#4e6b5d] min-w-[280px]">Concepto</th>
            <th className="px-4 py-3 bg-[#5c7a6b]">Total presupuestado {vm.year}</th>
            <th className="px-4 py-3 bg-[#5c7a6b]">Gasto generado {vm.year}</th>
            <th className="px-4 py-3 bg-[#5c7a6b]">Saldo actual {vm.year}</th>
            {monthNames.map((m, i) => (
              <React.Fragment key={m}>
                <th className="px-4 py-3 bg-[#5c7a6b]">Presupuesto {m} {vm.year}</th>
                <th className="px-4 py-3 bg-[#4a6456]">Gasto final {m} {vm.year}</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {vm.groups.map(group => (
            <React.Fragment key={group.groupData}>
              {/* CABECERA DE GRUPO */}
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <td className="px-4 py-3 font-semibold uppercase text-gray-700 sticky left-0 z-10 bg-gray-50">
                  {groupTitles[group.groupData] || group.groupData}
                </td>
                <td className="px-4 py-3 font-semibold">{formatMXN(group.budgeted)}</td>
                <td className="px-4 py-3 font-semibold">{formatMXN(group.generated)}</td>
                <td className="px-4 py-3 font-semibold">{formatMXN(group.balance)}</td>
                <td colSpan={24} className="bg-gray-50"></td>
              </tr>
              
              {/* FILAS DE CONCEPTOS */}
              {group.concepts.map(concept => (
                <tr key={concept.conceptId} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2 text-gray-600 sticky left-0 z-10 bg-white border-r border-gray-100 uppercase text-xs">
                    {concept.conceptName}
                  </td>
                  <td className="px-4 py-2 font-medium">{formatMXN(concept.budgeted)}</td>
                  <td className="px-4 py-2">{formatMXN(concept.generated)}</td>
                  <td className={`px-4 py-2 font-medium ${concept.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatMXN(concept.balance)}
                  </td>
                  
                  {concept.months.map((m, i) => (
                    <React.Fragment key={m.month}>
                      <td className="px-2 py-2 w-32 border-l border-gray-50">
                        {isClosed ? (
                          <div className="px-2 py-1 bg-gray-100 rounded text-gray-500 line-through decoration-gray-400">
                            {formatMXN(m.budgeted)}
                          </div>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={m.budgeted || ""}
                              data-original={m.budgeted}
                              onBlur={(e) => handleBlur(e, concept.conceptId, m.month, m.budgetMonthId)}
                              className="w-full border-gray-200 rounded px-2 py-1 pl-5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 bg-gray-50/50 text-gray-600 text-sm">
                        {formatMXN(m.generated)}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}

              {/* TOTAL DEL GRUPO (Opional, si legacy lo tiene al pie. Omitido porque ya está en cabecera) */}
            </React.Fragment>
          ))}
          
          {/* TOTAL GLOBAL */}
          <tr className="bg-[#4e6b5d] text-white">
            <td className="px-4 py-4 font-bold sticky left-0 z-10 bg-[#4e6b5d] text-lg">TOTAL GENERAL</td>
            <td className="px-4 py-4 font-bold text-lg">{formatMXN(vm.totalBudgeted)}</td>
            <td className="px-4 py-4 font-bold text-lg">{formatMXN(vm.totalGenerated)}</td>
            <td className="px-4 py-4 font-bold text-lg">{formatMXN(vm.totalBalance)}</td>
            <td colSpan={24} className="bg-[#4e6b5d]"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
