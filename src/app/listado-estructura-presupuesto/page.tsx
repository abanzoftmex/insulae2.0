import React from "react";
import { getBudgetStructureUseCase } from "@/modules/budget";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { YearSelector } from "../presupuestos/components/year-selector";
import { DeleteButton, DeleteConceptTrigger } from "./components/delete-actions";

export default async function BudgetStructurePage(props: { searchParams: Promise<{ anio?: string }> }) {
  const searchParams = await props.searchParams;
  const currentYear = new Date().getFullYear();
  const year = parseInt(searchParams.anio ?? "", 10) || currentYear;
  
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return <div className="p-10 text-2xl font-bold font-[ui-serif]">No hay condominios activos</div>;

  const vm = await getBudgetStructureUseCase.execute(condo.id, year);

  return (
    <main className="min-h-screen bg-[#fcf9f5] pb-20">
      {/* Header Estilo Valquirico */}
      <div className="bg-[#f8efe3]/90 border-b border-[#ccb49c]/40 backdrop-blur-md px-8 py-6 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="font-[ui-serif] text-3xl text-[#2f221a] leading-none mb-1">Estructura presupuesto</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a6a4a]">Gestión de grupos y conceptos</p>
          </div>
          <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-2xl border border-[#ccb49c]/30 shadow-sm">
             <span className="text-xs font-bold uppercase tracking-widest text-[#9a6a4a]">Año:</span>
             <YearSelector currentYear={currentYear} selectedYear={year} />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <a 
            href={`/listado-estructura-presupuesto/nuevo?anio=${year}`}
            className="bg-[#5a7b56] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#4a6b46] transition-all shadow-lg shadow-green-900/10 active:scale-95 flex items-center gap-2 uppercase tracking-wider"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Nuevo grupo
          </a>
          
          <button className="bg-white border border-[#ccb49c]/50 text-[#6d422a] p-2.5 rounded-xl hover:bg-[#2f221a] hover:text-white transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </div>

      <div className="px-8 mt-10 max-w-[1600px] mx-auto">
        {/* Tabla Estilo Legacy Modernizada */}
        <div className="bg-white rounded-[2rem] border border-[#ccb49c]/40 overflow-hidden shadow-[0_20px_50px_rgba(47,34,26,0.08)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#d5dadf] border-b border-[#ccb49c]/60">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.15em] text-[#2f221a] w-64 text-center border-r border-[#ccb49c]/40">Nombre</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.15em] text-[#2f221a] text-center border-r border-[#ccb49c]/40">Opciones</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.15em] text-[#2f221a] w-48 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ccb49c]/20">
              {vm.groups.map((group) => (
                <tr key={group.id} className="group hover:bg-[#fcf9f5] transition-colors">
                  <td className="px-8 py-10 border-r border-[#ccb49c]/20">
                    <div className="flex flex-col items-center">
                      <span className="font-[ui-serif] text-lg text-[#2f221a] text-center font-bold leading-tight">
                        {group.name}
                      </span>
                      <span className={`mt-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                        group.category === 'ADMINISTRATION' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        group.category === 'MAINTENANCE' ? 'bg-green-50 text-green-600 border-green-200' :
                        group.category === 'SECURITY' ? 'bg-red-50 text-red-600 border-red-200' :
                        group.category === 'INFRASTRUCTURE' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {group.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-10 bg-[#eef6ff]/40 border-r border-[#ccb49c]/20">
                    <div className="flex flex-wrap gap-x-2 gap-y-1 justify-center leading-relaxed">
                      {group.concepts.length > 0 ? (
                        group.concepts.map((concept, idx) => (
                          <React.Fragment key={concept.id}>
                            <span className="inline-flex items-center group/concept text-[13px] text-[#4a3a2e] font-medium uppercase tracking-tight hover:text-[#5a7b56] cursor-default transition-colors">
                              {concept.name}
                              <DeleteConceptTrigger id={concept.id} name={concept.name} />
                            </span>
                            {idx < group.concepts.length - 1 && (
                              <span className="text-[#ccb49c] font-light">, </span>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        <span className="text-[11px] text-[#ccb49c] italic font-light">Sin conceptos asignados</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-10">
                    <div className="flex justify-center gap-3">
                      <a 
                        href={`/listado-estructura-presupuesto/${group.id}?anio=${year}`}
                        className="bg-[#d2a35a] text-white p-2.5 rounded-xl hover:bg-[#b88d4a] transition-all shadow-md shadow-amber-900/10 hover:scale-110 active:scale-95"
                        title="Editar grupo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </a>
                      <DeleteButton id={group.id} type="group" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {vm.groups.length === 0 && (
            <div className="p-20 text-center bg-white">
               <div className="w-16 h-16 bg-[#f8efe3] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ccb49c]/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9a6a4a" strokeWidth="1.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
               </div>
               <h3 className="font-[ui-serif] text-xl text-[#2f221a]">No hay estructura para este año</h3>
               <p className="text-sm text-[#9a6a4a] mt-2 font-light">Comienza agregando un nuevo grupo de presupuesto.</p>
            </div>
          )}
        </div>
      </div>

      {/* Font Injection */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap" rel="stylesheet" />
    </main>
  );
}
