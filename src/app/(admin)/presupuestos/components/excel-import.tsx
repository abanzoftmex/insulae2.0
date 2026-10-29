"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Upload, Download, Loader2 } from "lucide-react";
import { importBudgetExcelAction } from "../actions";
import { useRouter } from "next/navigation";

export function ExcelImport({ year, isClosed }: { year: number; isClosed: boolean }) {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  if (isClosed) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const result = await importBudgetExcelAction(year, formData);
      
      if (result?.success) {
        const errorsList = (result as any).errors || [];
        if (errorsList.length > 0) {
          alert(`Importación completada con observaciones:\n- Se actualizaron ${(result as any).totalImported || 0} filas correctamente.\n\nErrores/Observaciones:\n${errorsList.slice(0, 10).join("\n")}${errorsList.length > 10 ? `\n... y ${errorsList.length - 10} errores más.` : ""}`);
        } else {
          alert(`¡Importación exitosa!\nSe actualizaron ${(result as any).totalImported || 0} filas correctamente.`);
        }
        router.refresh();
      } else {
        const errorMsg = (result as any)?.error || (result as any)?.errors?.join("\n");
        alert(`Error al importar:\n${errorMsg}`);
      }
    } catch (error: any) {
      alert(`Ocurrió un error inesperado:\n${error.message}`);
    } finally {
      setIsUploading(false);
      // Limpiar el input para permitir subir el mismo archivo otra vez si es necesario
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2 p-1 bg-canvas-2 rounded-xl border border-line/60 shadow-xs">
      <Link
        href={`/presupuestos/plantilla?anio=${year}`}
        className="h-8 px-3.5 flex items-center gap-1.5 text-ink-soft hover:text-ink text-[11px] font-bold uppercase tracking-wider transition-colors rounded-lg hover:bg-canvas"
        download
      >
        <Download className="h-3.5 w-3.5" /> Plantilla
      </Link>
      <div className="w-px h-4 bg-line/60" />
      <div className="flex items-center gap-2">
        <label 
          className={`h-8 px-4 flex items-center justify-center rounded-lg bg-green-700 hover:bg-green-800 text-white text-[11px] font-extrabold uppercase tracking-wider transition-all shadow-xs ${isUploading ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:shadow-sm active:scale-95"}`}
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1.5" />
          )}
          {isUploading ? "Importando..." : "Importar"}
          <input
            type="file"
            name="file"
            accept=".xlsx"
            className="hidden"
            disabled={isUploading}
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
}
