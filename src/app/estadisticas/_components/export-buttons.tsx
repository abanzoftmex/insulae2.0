"use client";

import { useState } from "react";
import { FileDown, Printer } from "lucide-react";
import * as XLSX from "xlsx";

export interface StatisticsExportPayload {
  condominiumName: string;
  generatedAtLabel: string;
  filtersLabel: string;
  kpis: { label: string; value: string; hint?: string }[];
  sheets: { name: string; rows: Record<string, string | number>[] }[];
  caveats: string[];
}

function fileStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildPrintHtml(payload: StatisticsExportPayload): string {
  const kpiRows = payload.kpis
    .map(
      (kpi) => `
        <div class="kpi">
          <p class="kpi-label">${escapeHtml(kpi.label)}</p>
          <p class="kpi-value">${escapeHtml(kpi.value)}</p>
          ${kpi.hint ? `<p class="kpi-hint">${escapeHtml(kpi.hint)}</p>` : ""}
        </div>`,
    )
    .join("");

  const sections = payload.sheets
    .filter((sheet) => sheet.rows.length > 0)
    .map((sheet) => {
      const keys = Object.keys(sheet.rows[0]);
      const head = keys.map((key) => `<th>${escapeHtml(key)}</th>`).join("");
      const body = sheet.rows
        .map(
          (row) =>
            `<tr>${keys
              .map((key) => {
                const value = row[key] ?? "";
                const isNumber = typeof value === "number";
                return `<td class="${isNumber ? "num" : ""}">${escapeHtml(
                  isNumber ? new Intl.NumberFormat("es-MX").format(value) : String(value),
                )}</td>`;
              })
              .join("")}</tr>`,
        )
        .join("");
      return `
        <section>
          <h2>${escapeHtml(sheet.name)}</h2>
          <table>
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </section>`;
    })
    .join("");

  const caveats = payload.caveats.length
    ? `<section class="caveats">
        <h2>Notas metodológicas</h2>
        <ul>${payload.caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("")}</ul>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Estadísticas — ${escapeHtml(payload.condominiumName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1f1f1f; padding: 28px 32px; font-size: 11px; }
  header { border-bottom: 2px solid #5d5b35; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 18px; color: #3d3c22; }
  .meta { color: #666; margin-top: 3px; font-size: 10px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .kpi { border: 1px solid #ddd8c8; border-radius: 6px; padding: 8px 10px; }
  .kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #75724a; font-weight: 700; }
  .kpi-value { font-size: 16px; font-weight: 700; color: #3d3c22; margin-top: 2px; }
  .kpi-hint { font-size: 8.5px; color: #888; margin-top: 1px; }
  section { margin-bottom: 14px; break-inside: avoid; }
  h2 { font-size: 12px; color: #5d5b35; margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; color: #75724a; border-bottom: 1px solid #c9c4ae; padding: 3px 6px; }
  td { padding: 3px 6px; border-bottom: 1px solid #eeeae0; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .caveats ul { padding-left: 16px; color: #666; font-size: 9.5px; }
  .caveats li { margin-bottom: 2px; }
  @page { margin: 14mm 12mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <header>
    <h1>Estadísticas — ${escapeHtml(payload.condominiumName)}</h1>
    <p class="meta">Generado: ${escapeHtml(payload.generatedAtLabel)} · Filtros: ${escapeHtml(payload.filtersLabel)}</p>
  </header>
  <div class="kpis">${kpiRows}</div>
  ${sections}
  ${caveats}
</body>
</html>`;
}

export function ExportButtons({ payload }: { payload: StatisticsExportPayload }) {
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const exportExcel = () => {
    setBusy("xlsx");
    try {
      const workbook = XLSX.utils.book_new();
      const kpiSheet = XLSX.utils.aoa_to_sheet([
        [`Estadísticas — ${payload.condominiumName}`],
        [`Generado: ${payload.generatedAtLabel}`],
        [`Filtros: ${payload.filtersLabel}`],
        [],
        ["Indicador", "Valor", "Detalle"],
        ...payload.kpis.map((kpi) => [kpi.label, kpi.value, kpi.hint ?? ""]),
      ]);
      kpiSheet["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 44 }];
      XLSX.utils.book_append_sheet(workbook, kpiSheet, "KPIs");

      for (const sheet of payload.sheets) {
        if (!sheet.rows.length) continue;
        const ws = XLSX.utils.json_to_sheet(sheet.rows);
        ws["!cols"] = Object.keys(sheet.rows[0]).map((key) => ({
          wch: Math.max(key.length + 2, 18),
        }));
        // Los nombres de hoja en Excel se limitan a 31 caracteres
        XLSX.utils.book_append_sheet(workbook, ws, sheet.name.slice(0, 31));
      }

      if (payload.caveats.length) {
        const notesSheet = XLSX.utils.aoa_to_sheet([["Notas metodológicas"], [], ...payload.caveats.map((c) => [c])]);
        notesSheet["!cols"] = [{ wch: 110 }];
        XLSX.utils.book_append_sheet(workbook, notesSheet, "Notas");
      }

      XLSX.writeFile(workbook, `Estadisticas_${payload.condominiumName.replace(/[^\w]+/g, "_")}_${fileStamp()}.xlsx`);
    } finally {
      setBusy(null);
    }
  };

  // PDF vía diálogo de impresión del navegador (guardar como PDF):
  // evita depender de librerías de generación de PDF en el cliente.
  const exportPdf = () => {
    setBusy("pdf");
    try {
      const printWindow = window.open("", "_blank", "width=1000,height=800");
      if (!printWindow) return;
      printWindow.document.write(buildPrintHtml(payload));
      printWindow.document.close();
      printWindow.focus();
      // Espera breve a que el documento pinte antes de abrir el diálogo
      printWindow.setTimeout(() => {
        printWindow.print();
      }, 250);
    } finally {
      setBusy(null);
    }
  };

  const buttonClass =
    "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-line bg-card text-[12px] font-semibold text-ink hover:bg-canvas-2 transition-standard disabled:opacity-50";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={exportExcel} disabled={busy !== null} className={buttonClass}>
        <FileDown className="w-3.5 h-3.5 text-brand" />
        {busy === "xlsx" ? "Generando…" : "Excel"}
      </button>
      <button type="button" onClick={exportPdf} disabled={busy !== null} className={buttonClass}>
        <Printer className="w-3.5 h-3.5 text-terracotta" />
        PDF
      </button>
    </div>
  );
}
