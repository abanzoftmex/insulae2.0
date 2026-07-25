"use client";

import React, { useState } from "react";
import { read, utils } from "xlsx";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { importIncomesAction } from "../../import-actions";
import { useRouter } from "next/navigation";

export function ImportIncomeForm() {
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
      const wb = read(buffer, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: unknown[][] = utils.sheet_to_json(ws, { header: 1 });
      
      const rows = raw
        .slice(1) // Skip headers
        .filter((r) => Array.isArray(r) && r.some((c) => c != null && c !== ""))
        .map((r) => {
          const row = r as any[];
          // Mapper to match legacy order and names
          // Headers: fecha, monto, id_categoria, id_tipo_cuota, id_forma_pago, comentarios
          const rawDate = row[0];
          const date = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate ?? "");
          const amount = parseFloat(String(row[1] ?? "0"));
          const miscCatalogId = String(row[2] ?? "").trim() || undefined;
          const chargeGroupId = String(row[3] ?? "").trim() || undefined;
          const methodInput = String(row[4] ?? "1");
          const concept = String(row[5] ?? "");

          const methodMap: Record<string, string> = {
            "1": "CASH",        // Efectivo
            "2": "TRANSFER",    // Transferencia
            "3": "CARD",        // Tarjeta
            "4": "CHECK",       // Cheque
            "5": "OTHER",       // Otro
            "6": "OTHER",       // Otro
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
            miscCatalogId,
            chargeGroupId,
            paymentMethod,
            concept: concept || "Importación masiva",
            notes: `Importado de Excel - ${new Date().toLocaleDateString()}`,
          };
        });

      if (rows.length === 0) {
        setResult({ success: false, errors: ["El archivo no contiene datos válidos"] });
        return;
      }

      const res = await importIncomesAction(rows);
      setResult(res);
      
      if (res.success && res.imported && res.imported > 0) {
        setTimeout(() => {
          router.push("/listado-ingresos");
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
          importing ? "border-brand-accent bg-brand-accent/5 opacity-50 pointer-events-none" : "border-ink-soft/20 bg-white hover:border-brand-accent hover:bg-canvas"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center">
            {importing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-lg text-ink">
              {importing ? "Procesando archivo..." : "Seleccione su archivo Excel"}
            </h4>
            <p className="text-sm text-ink-soft max-w-sm mx-auto">
              Haga clic aquí o arrastre su archivo .xlsx terminado para iniciar el proceso de importación.
            </p>
          </div>
          <label className={`cursor-pointer px-10 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] transition-all ${
            importing ? "bg-ink-soft/10 text-ink-soft/40" : "bg-brand text-white hover:bg-brand/90 hover:scale-105 active:scale-95 shadow-lg shadow-brand/20"
          }`}>
            {importing ? "Cargando..." : "Subir Archivo"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
      </div>

      {result && (
        <div className={`p-6 rounded-2xl border animate-in slide-in-from-top-4 duration-300 ${
          result.success ? "bg-lime-50 border-lime-200" : "bg-danger/5 border-danger/20"
        }`}>
          <div className="flex gap-4">
            {result.success ? (
              <CheckCircle2 className="h-6 w-6 text-lime-600 shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-danger shrink-0" />
            )}
            <div className="space-y-2">
              <h5 className={`font-bold text-sm uppercase tracking-tight ${result.success ? "text-lime-800" : "text-danger"}`}>
                {result.success ? "¡Importación Exitosa!" : "Hubo problemas con la carga"}
              </h5>
              {result.success && (
                <p className="text-sm text-lime-700 font-medium">
                  Se han importado <span className="underline">{result.imported}</span> registros correctamente. Redirigiendo...
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-ink-soft uppercase">Detalle de errores:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-[11px] text-danger/80 italic font-medium">
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
