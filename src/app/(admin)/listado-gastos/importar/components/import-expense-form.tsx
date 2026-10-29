"use client";

import React, { useState } from "react";
import { read, utils } from "xlsx";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { importExpensesAction } from "../../import-actions";
import { useRouter } from "next/navigation";

export function ImportExpenseForm() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; imported?: number; errors?: string[] } | null>(null);
  const router = useRouter();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: unknown[][] = utils.sheet_to_json(ws, { header: 1 });
      
      const rows = raw
        .slice(1) // Skip headers
        .filter((r) => Array.isArray(r) && r.some((c) => c != null && c !== ""))
        .map((r) => {
          const row = r as any[];
          // Mapper to match exactly the image provided
          // A: fecha, B: monto, C: id_concepto, D: id_forma_pago, E: recibo, F: comentarios, G: proyecto
          const date = String(row[0] ?? "");
          const amount = parseFloat(String(row[1] ?? "0"));
          const budgetConceptId = String(row[2] ?? "").trim() || undefined;
          const methodInput = String(row[3] ?? "1");
          const receipt = String(row[4] ?? "").trim() || undefined;
          const concept = String(row[5] ?? "").trim() || "Gasto importado";
          const projectName = String(row[6] ?? "").trim() || undefined;

          const methodMap: Record<string, string> = {
            "1": "OTHER",    // N/A
            "2": "CASH",     // Efectivo
            "3": "TRANSFER", // Transferencia
            "4": "CARD",     // Tarjeta
            "5": "CHECK",    // Cheque
            "6": "OTHER",    // Otro
            "EFECTIVO": "CASH",
            "TRANSFERENCIA": "TRANSFER",
            "TARJETA": "CARD",
            "CHEQUE": "CHECK",
            "OTRO": "OTHER",
          };

          const paymentMethod = methodMap[methodInput.toUpperCase()] || "OTHER";

          return {
            date,
            amount,
            budgetConceptId,
            paymentMethod,
            receipt,
            concept,
            projectName,
            notes: `Importado de Excel - ${new Date().toLocaleDateString()}`,
          };
        });

      if (rows.length === 0) {
        setResult({ success: false, errors: ["El archivo no contiene datos válidos"] });
        return;
      }

      const res = await importExpensesAction(rows);
      setResult(res);
      
      if (res.success && res.imported && res.imported > 0) {
        setTimeout(() => {
          router.push("/listado-gastos");
          router.refresh();
        }, 3000);
      }
    } catch (err: any) {
      setResult({ success: false, errors: ["Error al procesar el archivo: " + err.message] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div 
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
          importing ? "border-[#ccb49c] bg-[#ccb49c]/5 opacity-50 pointer-events-none" : "border-ink-soft/20 bg-white hover:border-[#ccb49c] hover:bg-[#fcf9f5]"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[#ccb49c]/10 text-[#6d422a] flex items-center justify-center">
            {importing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-lg text-[#6d422a]">
              {importing ? "Procesando archivo..." : "Seleccione su archivo Excel"}
            </h4>
            <p className="text-sm text-ink-soft max-w-sm mx-auto">
              Haga clic aquí o arrastre su archivo .xlsx con los gastos para iniciar la carga.
            </p>
          </div>
          <label className={`cursor-pointer px-10 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] transition-all ${
            importing ? "bg-ink-soft/10 text-ink-soft/40" : "bg-[#6d422a] text-[#fcf9f5] hover:scale-105 active:scale-95 shadow-lg shadow-[#6d422a]/20"
          }`}>
            {importing ? "Cargando..." : "Subir Archivo"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </div>

      {result && (
        <div className={`p-6 rounded-2xl border animate-in slide-in-from-top-4 duration-300 ${
          result.success ? "bg-lime-50 border-lime-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex gap-4">
            {result.success ? (
              <CheckCircle2 className="h-6 w-6 text-lime-600 shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
            )}
            <div className="space-y-2">
              <h5 className={`font-bold text-sm uppercase tracking-tight ${result.success ? "text-lime-800" : "text-red-800"}`}>
                {result.success ? "¡Importación Exitosa!" : "Hubo problemas con la carga"}
              </h5>
              {result.success && (
                <p className="text-sm text-lime-700 font-medium">
                  Se han importado <span className="underline">{result.imported}</span> gastos correctamente. Redirigiendo al listado...
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-ink-soft uppercase">Detalle de errores:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-[11px] text-red-700/80 italic font-medium">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
