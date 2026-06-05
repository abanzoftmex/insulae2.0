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
        alert(`¡Importación exitosa!\nSe actualizaron ${(result as any).totalImported || 0} filas correctamente.`);
        // Forzar al navegador a recargar los datos actualizados de la tabla
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
    <div className="flex items-center gap-2 p-1 bg-canvas-2 rounded-lg border border-line/50">
      <Link
        href={`/presupuestos/plantilla?anio=${year}`}
        className="h-7 px-3 flex items-center gap-1.5 text-ink-soft hover:text-ink text-[11px] font-semibold uppercase transition-colors"
        download
      >
        <Download className="h-3 w-3" /> Plantilla
      </Link>
      <div className="w-px h-4 bg-line" />
      <div className="flex items-center gap-2">
        <label 
          className={`h-7 px-3 flex items-center justify-center rounded-pill border border-brand-accent text-brand-accent text-[11px] font-semibold uppercase transition-standard ${isUploading ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:bg-brand-accent/5"}`}
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Upload className="h-3 w-3 mr-1" />
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
