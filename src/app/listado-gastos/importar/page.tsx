export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { ChevronLeft, FileDown, Info, ListChecks, Table } from "lucide-react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { ImportExpenseForm } from "./components/import-expense-form";

const BUDGET_GROUP_LABELS: Record<string, string> = {
  ADMINISTRATION: "Administración",
  MAINTENANCE: "Mantenimiento",
  SERVICES: "Servicios",
  FIXED_FUNDS: "Fondos fijos",
  EXTRAORDINARY: "Extraordinarios",
};

export default async function ImportExpensesPage() {
  const condo = await prisma.condominium.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const budgetConcepts = condo
    ? await prisma.budgetExpenseConcept.findMany({
        where: { condominiumId: condo.id, isActive: true },
        orderBy: [{ budgetGroup: "asc" }, { name: "asc" }],
        select: { id: true, legacyBudgetConceptId: true, name: true, budgetGroup: true },
      })
    : [];

  return (
    <main className="min-h-screen bg-[#fcf9f5] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-line px-8 py-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/listado-gastos" 
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-line text-ink-soft hover:bg-canvas transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight uppercase">Importador de Gastos</h1>
              <p className="text-sm text-ink-soft font-medium">Sincronización masiva desde Excel</p>
            </div>
          </div>
          <a 
            href="/listado-gastos/plantilla" 
            download
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand/20"
          >
            <FileDown className="h-4 w-4" /> Plantilla Oficial
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Guia de Pasos */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-[2rem] border border-line p-8 shadow-sm">
            <h3 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-brand" /> Pasos para la importación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: "01", title: "Plantilla", desc: "Descarga la plantilla y respeta los encabezados exactamente como están." },
                { step: "02", title: "ID Concepto", desc: "Usa el ID del catálogo adjunto. Puedes usar el número de Legacy." },
                { step: "03", title: "Carga", desc: "Sube el archivo aquí abajo. Validaremos los datos antes de guardarlos." }
              ].map((p, i) => (
                <div key={i} className="relative group">
                  <span className="text-4xl font-black text-brand/5 absolute -top-4 -left-2 group-hover:text-brand/10 transition-colors">{p.step}</span>
                  <div className="relative">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-[#6d422a] mb-1">{p.title}</h4>
                    <p className="text-[11px] text-ink-soft leading-relaxed font-medium">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-line/50">
              <div className="bg-brand/5 rounded-2xl p-4 flex gap-4 items-start border border-brand/10">
                <Info className="h-5 w-5 text-brand shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-brand uppercase tracking-tighter">Tips de formato</p>
                  <ul className="text-[10px] text-ink-soft space-y-1 font-medium list-disc list-inside">
                    <li>Fecha: Usa <span className="text-ink">AAAA-MM-DD</span> (ej. 2026-05-20).</li>
                    <li>Monto: Solo números, evita signos de pesos o comas (ej. 1450.50).</li>
                    <li>Concepto: Se mapea a través del <b>ID Concepto</b> (columna C).</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <ImportExpenseForm />
        </div>

        {/* Catalogos de Referencia */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-line overflow-hidden shadow-sm">
            <div className="p-6 border-b border-line bg-canvas/30">
              <h3 className="text-xs font-black text-ink uppercase tracking-widest flex items-center gap-2">
                <Table className="h-4 w-4 text-brand" /> Catálogo de Conceptos
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr className="border-b border-line">
                    <th className="px-4 py-3 text-[10px] font-black text-ink-soft uppercase tracking-tighter">ID</th>
                    <th className="px-4 py-3 text-[10px] font-black text-ink-soft uppercase tracking-tighter">Grupo</th>
                    <th className="px-4 py-3 text-[10px] font-black text-ink-soft uppercase tracking-tighter">Nombre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {budgetConcepts.map((c) => (
                    <tr key={c.id} className="hover:bg-canvas/40 transition-colors group">
                      <td className="px-4 py-3 font-mono text-[10px] font-bold text-brand group-hover:scale-110 transition-transform origin-left">
                        {c.legacyBudgetConceptId ?? c.id.slice(0, 4)}
                      </td>
                      <td className="px-4 py-3 text-[9px] font-bold text-ink-soft uppercase">
                        {BUDGET_GROUP_LABELS[c.budgetGroup] || c.budgetGroup}
                      </td>
                      <td className="px-4 py-3 text-[10px] font-medium text-ink leading-tight">
                        {c.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-line p-6 shadow-sm">
            <h3 className="text-[10px] font-black text-ink-soft uppercase tracking-widest mb-4">Formas de Pago (ID)</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "1", label: "N/A" },
                { id: "2", label: "Efectivo" },
                { id: "3", label: "Transferencia" },
                { id: "4", label: "Tarjeta" },
                { id: "5", label: "Cheque" },
                { id: "6", label: "Otro" }
              ].map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-canvas/50 border border-line/50">
                  <span className="text-[10px] font-black text-brand">{m.id}</span>
                  <span className="text-[10px] font-bold text-ink-soft uppercase">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

