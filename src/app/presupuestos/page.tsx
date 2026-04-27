import React from "react";
import { getBudgetByYearUseCase } from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";
import BudgetTable from "./components/budget-table";
import { toggleBudgetStatusAction, importBudgetExcelAction } from "./actions";
import { YearSelector } from "./components/year-selector";

function StatusToggle({ isClosed, budgetId }: { isClosed: boolean, budgetId: string | undefined }) {
  if (!budgetId) return null; // no hay budget id creado
  const actionWithForm = async () => {
    "use server";
    await toggleBudgetStatusAction(budgetId);
  };
  return (
    <form action={actionWithForm}>
      <button 
        type="submit" 
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
          isClosed ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
      >
        <span>{isClosed ? "🔒 Presupuesto Cerrado" : "🔓 Presupuesto Abierto"}</span>
        <span className="text-sm font-normal underline">
          ({isClosed ? "Abrir" : "Cerrar"})
        </span>
      </button>
    </form>
  );
}

// Componente de Importacion Excel
function ExcelImport({ year, isClosed }: { year: number, isClosed: boolean }) {
  if (isClosed) return null;
  const actionWithYear = async (formData: FormData) => {
    "use server";
    await importBudgetExcelAction(year, formData);
  };

  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
      <a 
        href={`/presupuestos/plantilla?anio=${year}`} 
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm font-semibold hover:bg-blue-100 transition-colors"
        download
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Plantilla
      </a>
      <div className="w-px h-6 bg-gray-200" />
      <form action={actionWithYear} className="flex items-center gap-2">
        <input type="file" name="file" accept=".xlsx" required className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 w-64" />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition">
          Importar Excel
        </button>
      </form>
    </div>
  );
}

import { SummaryCards } from "./components/summary-cards";

export default async function PresupuestosPage(props: { searchParams: Promise<{ anio?: string }> }) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getFullYear();
  const year = parseInt(searchParams.anio ?? "", 10) || currentYear;
  
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return <div className="p-10 text-2xl font-bold">No hay condominios activos</div>;

  const vm = await getBudgetByYearUseCase.execute(condo.id, year);
  const isClosed = vm.status === "CLOSED";

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-800">Presupuestos</h1>
          <YearSelector currentYear={currentYear} selectedYear={year} />
        </div>
        
        <div className="flex items-center gap-4">
          <StatusToggle isClosed={isClosed} budgetId={vm.id} />
          <ExcelImport year={year} isClosed={isClosed} />
          <a 
            href={`/presupuestos/imprimir?anio=${year}`}
            target="_blank"
            className="bg-gray-800 text-white px-4 py-2 flex items-center gap-2 rounded-lg text-sm hover:bg-gray-700 transition-all active:scale-95 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Exportar PDF
          </a>
        </div>
      </div>

      <div className="px-6 mt-6">
        {/* Resumen Numerico Superior - High Level */}
        <div className="flex gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col justify-center transition-all hover:shadow-md">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Presupuesto {year}</p>
            <p className="text-3xl font-black text-gray-900 tracking-tight">
              {new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN"}).format(vm.totalBudgeted)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col justify-center transition-all hover:shadow-md">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Gasto {year}</p>
            <p className="text-3xl font-black text-gray-900 tracking-tight">
              {new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN"}).format(vm.totalGenerated)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-blue-800 p-5 rounded-2xl shadow-lg flex-1 flex flex-col justify-center text-white transition-all hover:scale-[1.02] hover:shadow-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-1">Saldo del Proyecto</p>
            <p className="text-3xl font-black tracking-tight">
              {new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN"}).format(vm.totalBalance)}
            </p>
          </div>
        </div>

        {/* Detalle de Cuotas - Legacy Style */}
        <SummaryCards cards={vm.summaryCards} />

        <BudgetTable vm={vm} />
      </div>
    </main>
  );
}
