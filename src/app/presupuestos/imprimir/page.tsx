import React from "react";
import { getBudgetByYearUseCase } from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { ExpenseBudgetGroup } from "@prisma/client";

export default async function BudgetPrintPage(props: { searchParams: Promise<{ anio?: string }> }) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getFullYear();
  const year = parseInt(searchParams.anio ?? "", 10) || currentYear;
  
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return <div className="p-10 text-2xl font-bold">No hay condominios activos</div>;

  const vm = await getBudgetByYearUseCase.execute(condo.id, year);

  const groupNames: Record<ExpenseBudgetGroup, string> = {
    [ExpenseBudgetGroup.ADMINISTRATION]: "Gastos administración",
    [ExpenseBudgetGroup.MAINTENANCE]: "Gastos de mantenimiento",
    [ExpenseBudgetGroup.SECURITY]: "Gastos de seguridad",
    [ExpenseBudgetGroup.INFRASTRUCTURE]: "Gastos de infraestructura",
    [ExpenseBudgetGroup.EXTRAORDINARY]: "Gastos extraordinarios",
    [ExpenseBudgetGroup.OTHER]: "Otros gastos"
  };

  return (
    <div className="bg-white p-8 max-w-[1000px] mx-auto text-gray-900 print:p-0">
      <script dangerouslySetInnerHTML={{ __html: "window.onload = () => { window.print(); }" }} />
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-100 pb-6">
        <div>
          <h1 className="text-4xl font-bold mb-1">Presupuesto {year}</h1>
          <h2 className="text-2xl font-medium text-gray-600 tracking-wide">{condo.name.toUpperCase()}</h2>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-gray-800">VAL'QUIRICO</div>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-tighter">Sistema Condominal | Impresión</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {vm.summaryCards.map((card, idx) => (
          <div key={idx} className="border-2 border-amber-400/30 rounded-2xl p-4 bg-amber-50/10">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{card.title}</p>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-400">Presupuestado</span>
              <span className="text-lg font-black">
                {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(card.budgeted)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-amber-100 mt-1 pt-1">
              <span className="text-[10px] text-gray-400">Gastado</span>
              <span className="text-xs font-semibold text-gray-600">
                {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(card.generated)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Group Tables */}
      <div className="space-y-12">
        {vm.groups.map((group) => (
          <div key={group.groupData} className="break-inside-avoid">
            <h3 className="text-xl font-bold mb-4 border-l-4 border-amber-500 pl-3 py-1 bg-gray-50 uppercase tracking-tight">
              {groupNames[group.groupData]}
            </h3>
            
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-50 border-b-2 border-blue-100">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase text-blue-900 w-1/2">Concepto</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase text-blue-900">Presupuestado {year}</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase text-blue-900">Gastado {year}</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase text-blue-900">Saldo Actual</th>
                </tr>
              </thead>
              <tbody>
                {group.concepts.map((concept) => (
                  <tr key={concept.conceptId} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4 text-xs font-medium text-gray-700">{concept.conceptName}</td>
                    <td className="py-2.5 px-4 text-right text-xs text-gray-600">
                      {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(concept.budgeted)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-xs text-gray-600">
                      {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(concept.generated)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-xs font-bold text-gray-800">
                      {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(concept.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td className="py-3 px-4 text-sm uppercase">Total {groupNames[group.groupData]}</td>
                  <td className="py-3 px-4 text-right text-sm">
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(group.budgeted)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm">
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(group.generated)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm">
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(group.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-gray-100 text-center text-[10px] text-gray-400 uppercase tracking-widest">
        Documento generado automáticamente por el Sistema Condominal Val'Quirico &bull; {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
