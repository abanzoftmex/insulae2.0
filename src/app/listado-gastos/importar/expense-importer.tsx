"use client";

import React, { useState } from "react";
import Link from "next/link";
import { read, utils } from "xlsx";
import { importExpensesAction } from "../import-actions";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  CHECK: "Cheque",
  OTHER: "Otro",
};

interface BudgetConceptItem {
  id: string;
  legacyBudgetConceptId?: number | null;
  name: string;
  budgetGroup: string;
}

const BUDGET_GROUP_LABELS: Record<string, string> = {
  ADMINISTRATION: "Gastos de administración",
  MAINTENANCE: "Gastos de mantenimiento",
  SERVICES: "Servicios",
  FIXED_FUNDS: "Fondos fijos",
  EXTRAORDINARY: "Cuotas extraordinarias",
};

interface Props {
  budgetConcepts: BudgetConceptItem[];
}

export function ExpenseImporter({ budgetConcepts = [] }: Props) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported?: number;
    errors?: string[];
    error?: string;
  } | null>(null);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = utils.sheet_to_json(ws, { header: 1 });
      
      const rows = raw
        .slice(1)
        .filter((r) => r.some((c: any) => c != null && c !== ""))
        .map((r) => ({
          budgetConceptId: String(r[0] ?? "").trim() || undefined,
          date: String(r[1] ?? ""),
          amount: parseFloat(String(r[2] ?? "0")),
          paymentMethod: String(r[3] ?? "CASH"),
          concept: String(r[4] ?? ""),
          projectName: String(r[5] ?? "").trim() || undefined,
          notes: String(r[6] ?? "").trim() || undefined,
        }));

      const res = await importExpensesAction(rows);
      if (res.success) {
        setImportResult({
          success: true,
          imported: res.imported,
          errors: res.errors,
        });
      } else {
        setImportResult({
          success: false,
          error: res.error,
        });
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        error: err.message || "Error procesando el archivo",
      });
    } finally {
      setImporting(false);
      e.target.value = ""; // reset input
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/listado-gastos"
          className="border border-[#ccb49c]/40 p-2.5 rounded-xl text-[#6d422a] hover:bg-[#f8efe3]/50 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div>
          <h1 className="font-[ui-serif] text-3xl text-[#2f221a]">Importador Masivo de Egresos</h1>
          <p className="text-[#9a6a4a] text-sm mt-1 uppercase tracking-widest font-medium">
            Carga masiva desde Excel
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm p-8 space-y-6">
          <div>
            <h2 className="font-[ui-serif] text-xl text-[#2f221a] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7b56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Paso 1: Descargar Plantilla
            </h2>
            <div className="mt-4 bg-[#e8f4fa] rounded-xl p-5 border border-[#bce0f0]">
              <h3 className="font-bold text-[#1f6080] mb-2 text-sm">Instrucciones:</h3>
              <ol className="text-sm text-[#2f6f8f] space-y-1.5 list-decimal list-inside ml-1">
                <li>Descargue la plantilla Excel haciendo clic en el botón.</li>
                <li>Complete los datos de los egresos siguiendo el formato exacto.</li>
                <li>Use los IDs de los conceptos mostrados en la segunda pestaña del archivo.</li>
                <li>Guarde el archivo y súbalo en el paso 2.</li>
              </ol>
            </div>
            <a
              href="/listado-gastos/plantilla"
              className="inline-flex items-center gap-2 bg-[#5a7b56] hover:bg-[#4a6b46] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm mt-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" x2="12" y1="18" y2="12"/><line x1="9" x2="15" y1="15" y2="15"/></svg>
              <span className="text-white">Descargar Plantilla Excel</span>
            </a>
          </div>

          <div className="border-t border-[#ccb49c]/20 pt-6">
            <h2 className="font-[ui-serif] text-xl text-[#2f221a] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7b56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Paso 2: Subir Archivo
            </h2>
            <div className="mt-4">
              <label className="block w-full border-2 border-dashed border-[#ccb49c]/40 rounded-2xl p-10 text-center cursor-pointer hover:border-[#5a7b56]/60 hover:bg-[#f8efe3]/30 transition-all group">
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-[#fcf9f5] rounded-full p-4 group-hover:bg-[#ebe0d3] transition-colors border border-[#ccb49c]/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5a7b56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                  </div>
                  <div>
                    <p className="text-[#6d422a] font-medium text-lg">
                      {importing ? "Procesando archivo..." : "Haz clic para seleccionar el archivo Excel"}
                    </p>
                    <p className="text-sm text-[#9a6a4a] mt-1">Solo archivos .xlsx permitidos</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleImportFile}
                  disabled={importing}
                />
              </label>
            </div>
          </div>
        </section>

        {importResult && (
          <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm p-8 space-y-4">
            <h2 className="font-[ui-serif] text-xl text-[#2f221a]">
              Paso 3: Revisar Resultado
            </h2>
            
            {!importResult.success && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                Error general: {importResult.error}
              </div>
            )}

            {importResult.success && (
              <>
                <div className="p-4 bg-[#f2f8eb] border border-[#d6ebc2] rounded-xl flex items-start gap-3">
                  <div className="bg-white p-1 rounded-full shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a7b56" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <h3 className="text-[#3c523a] font-bold text-sm">Importación Completada</h3>
                    <p className="text-[#5a7b56] text-sm mt-0.5">Se han importado {importResult.imported} egresos exitosamente.</p>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-4 p-5 bg-amber-50 border border-amber-200 rounded-xl">
                    <h3 className="text-amber-800 font-bold text-sm mb-3 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Omitidos con errores ({importResult.errors.length}):
                    </h3>
                    <ul className="text-sm text-amber-700 space-y-1.5 list-disc list-inside max-h-64 overflow-y-auto bg-white/50 p-3 rounded-lg border border-amber-100">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <section className="bg-white rounded-3xl border border-[#ccb49c]/30 shadow-sm p-8 space-y-6">
          <div>
            <h2 className="font-[ui-serif] text-xl text-[#2f221a] mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7b56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              Catálogo de Conceptos de Presupuesto
            </h2>
            <p className="text-sm text-[#9a6a4a] mb-4">Use el <strong className="text-[#6d422a]">ID</strong> del concepto en la columna correspondiente del Excel.</p>
            <div className="overflow-x-auto border border-[#ccb49c]/20 rounded-xl max-h-96">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#5a7b56] text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Concepto</th>
                    <th className="px-4 py-3 font-semibold">Grupo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ccb49c]/10 text-[#2f221a] bg-[#fcf9f5]">
                  {(budgetConcepts || []).map((c) => (
                    <tr key={c.id} className="hover:bg-white transition-colors">
                      <td className="px-4 py-2 font-bold">{c.legacyBudgetConceptId ?? c.id.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-[#6d422a] font-medium whitespace-normal min-w-[200px]">{c.name}</td>
                      <td className="px-4 py-2 text-[#9a6a4a] whitespace-normal min-w-[200px]">{BUDGET_GROUP_LABELS[c.budgetGroup] || c.budgetGroup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-[#ccb49c]/20 pt-6">
            <h2 className="font-[ui-serif] text-xl text-[#2f221a] mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a7b56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              Catálogo de Formas de Pago
            </h2>
            <p className="text-sm text-[#9a6a4a] mb-4">Use exactamente el <strong className="text-[#6d422a]">ID</strong> que se muestra en esta tabla para la forma de pago.</p>
            <div className="overflow-x-auto border border-[#ccb49c]/20 rounded-xl">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#5a7b56] text-white">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-1/3">ID</th>
                    <th className="px-4 py-3 font-semibold">Forma de Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ccb49c]/10 text-[#2f221a] bg-[#fcf9f5]">
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([id, label]) => (
                    <tr key={id} className="hover:bg-white transition-colors">
                      <td className="px-4 py-2 font-bold">{id}</td>
                      <td className="px-4 py-2 text-[#6d422a] font-medium">{label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
