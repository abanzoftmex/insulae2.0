"use client";

import { useRef, useTransition } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Download, Upload, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importPrivateAreasCSVAction } from "../actions";

export function CsvManager() {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    window.location.assign("/api/private-areas/export");
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "ID", "Código", "Nombre", "Zona", "Subzona", "Calle", "Tipo Uso", "Nivel", 
      "Estatus", "M2 Original", "M2 Actual", "M2 Construcción", "M2 Comunes", 
      "M2 Construcción Hijos", "M2 Comunes Hijos", "M2 Construcción Áreas Comunes", "Indiviso", "VCCC", 
      "Código Padre", "Es Fusión", "Activo"
    ];
    
    const row = [
      "", "APOL-001", "Ejemplo APOL", "NORTE", "Sub A", "Calle 1", "COMERCIAL", "PB", 
      "DELIVERED", 100, 100, 80, 20, 0, 0, 0, 1.5, 500, "", "NO", "SI"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    
    XLSX.writeFile(wb, "plantilla_areas_privativas.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data;
          processImportData(rows);
        },
        error: (error) => {
          alert("Error leyendo el CSV: " + error.message);
        }
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        processImportData(rows);
      } catch (error: any) {
        alert("Error leyendo el Excel: " + error.message);
      }
    } else {
      alert("Formato de archivo no soportado. Por favor usa .csv o .xlsx");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processImportData = (rows: any[]) => {
    if (rows.length === 0) {
      alert("El archivo está vacío.");
      return;
    }

    startTransition(async () => {
      try {
        const plainRows = JSON.parse(JSON.stringify(rows));
        const result = await importPrivateAreasCSVAction(plainRows);
        if (result.success) {
          alert(`Se importaron ${rows.length} registros exitosamente.`);
          window.location.reload();
        } else {
          alert("Error al importar: " + result.error);
        }
      } catch (err: any) {
        alert("Error de procesamiento: " + err.message);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isPending}
        className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full border-brand/20 text-brand-deep hover:bg-brand/5 shadow-sm"
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden /> Exportar
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadTemplate}
        disabled={isPending}
        className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full border-lime-200 text-lime-800 hover:bg-lime-50 shadow-sm"
      >
        <FileDown className="h-3.5 w-3.5 shrink-0" aria-hidden /> Plantilla
      </Button>

      <input
        type="file"
        accept=".csv, .xlsx, .xls"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImport}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        className="h-8 gap-2 px-4 text-[10px] font-bold uppercase rounded-full border-cyan-200 text-cyan-800 hover:bg-cyan-50 shadow-sm"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Upload className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {isPending ? "Importando..." : "Importar"}
      </Button>
    </div>
  );
}
