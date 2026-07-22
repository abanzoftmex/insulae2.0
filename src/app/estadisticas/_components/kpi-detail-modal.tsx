"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  Search,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

import type { KpiDetail, KpiDetailRow, KpiKey } from "@/modules/statistics";
import { cn } from "@/shared/utils/cn";
import { HorizontalBars } from "./stats-charts";

const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("es-MX");

function cellText(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  return typeof value === "number" ? numberFormat.format(value) : value;
}

export function KpiDetailModal({
  kpiKey,
  filters,
  onClose,
}: {
  kpiKey: KpiKey;
  filters: { zone: string | null; useType: string | null };
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<KpiDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Carga del detalle
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ kpi: kpiKey });
    if (filters.zone) params.set("zona", filters.zone);
    if (filters.useType) params.set("uso", filters.useType);

    setDetail(null);
    setError(null);

    fetch(`/api/estadisticas/detalle?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "No se pudo cargar el detalle");
        }
        return response.json() as Promise<KpiDetail>;
      })
      .then(setDetail)
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      });

    return () => controller.abort();
  }, [kpiKey, filters.zone, filters.useType]);

  // Escape para cerrar + bloqueo de scroll de fondo
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const filteredRows = useMemo(() => {
    if (!detail) return [];
    const needle = query.trim().toLowerCase();
    const rows = needle
      ? detail.rows.filter((row) =>
          Object.values(row).some((value) => String(value).toLowerCase().includes(needle)),
        )
      : detail.rows;
    if (!sort) return rows;
    const sorted = [...rows].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (typeof left === "number" && typeof right === "number") return left - right;
      return String(left ?? "").localeCompare(String(right ?? ""), "es-MX", { numeric: true });
    });
    return sort.dir === "desc" ? sorted.reverse() : sorted;
  }, [detail, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = useCallback((key: string) => {
    setPage(1);
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  const exportRows = useCallback(() => {
    if (!detail) return;
    const labelled = filteredRows.map((row) =>
      Object.fromEntries(detail.columns.map((column) => [column.label, row[column.key] ?? ""])),
    );
    const worksheet = XLSX.utils.json_to_sheet(labelled as KpiDetailRow[]);
    worksheet["!cols"] = detail.columns.map((column) => ({ wch: Math.max(column.label.length + 2, 18) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, detail.tableTitle.slice(0, 31));
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${detail.tableTitle.replace(/[^\w]+/g, "_")}_${stamp}.xlsx`);
  }, [detail, filteredRows]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-3 md:p-4 animate-overlay-in"
      role="dialog"
      aria-modal="true"
      aria-label={detail?.title ?? "Detalle del indicador"}
    >
      <div className="absolute inset-0 bg-brand-deep/45 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div
        ref={panelRef}
        className={cn(
          "relative bg-card w-full h-full sm:rounded-2xl overflow-hidden flex flex-col",
          "shadow-[0_24px_60px_rgba(0,0,0,0.28)] animate-panel-zoom-in",
        )}
      >
        {/* Encabezado */}
        <header className="shrink-0 border-b border-line px-4 sm:px-6 py-3.5 flex items-start justify-between gap-4 bg-card">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-ink leading-tight truncate">
              {detail?.title ?? "Cargando detalle…"}
            </h2>
            {detail && <p className="text-[12px] text-ink-soft mt-0.5 line-clamp-2">{detail.subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {detail && (
              <button
                type="button"
                onClick={exportRows}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-line bg-card text-[12px] font-semibold text-ink hover:bg-canvas-2 transition-standard"
              >
                <FileDown className="w-3.5 h-3.5 text-brand" />
                <span className="hidden sm:inline">Exportar tabla</span>
              </button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-canvas-2 transition-standard active-scale"
              aria-label="Cerrar detalle"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {!detail && !error && (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3 text-ink-soft">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
              <p className="text-[13px]">Calculando estadísticas…</p>
            </div>
          )}

          {error && (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-7 h-7 text-terracotta" />
              <p className="text-[13px] text-ink font-semibold">{error}</p>
              <p className="text-[12px] text-ink-soft">Cierra el detalle e inténtalo de nuevo.</p>
            </div>
          )}

          {detail && (
            <div className="space-y-5">
              {/* Indicadores del KPI */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {detail.headline.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-line bg-canvas-2/60 px-3.5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">{stat.label}</p>
                    <p className="text-[22px] font-bold text-brand leading-none mt-1.5">{stat.value}</p>
                    {stat.hint && <p className="text-[10.5px] text-ink-soft/80 mt-1 leading-tight">{stat.hint}</p>}
                  </div>
                ))}
              </div>

              {/* Gráficas del KPI — items-start evita que una gráfica de pocas
                  barras se estire al alto de su vecina */}
              {detail.charts.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-4 items-start">
                  {detail.charts.map((chart) => (
                    <div key={chart.title} className="rounded-xl border border-line p-4">
                      <p className="text-[13px] font-bold text-ink mb-3">{chart.title}</p>
                      {chart.data.length > 0 ? (
                        <HorizontalBars data={chart.data} suffix={chart.suffix ?? ""} />
                      ) : (
                        <p className="text-[12px] text-ink-soft">Sin datos para este corte.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tabla de detalle */}
              <div className="rounded-xl border border-line overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line bg-canvas-2/40">
                  <div>
                    <p className="text-[13px] font-bold text-ink">{detail.tableTitle}</p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      {numberFormat.format(filteredRows.length)}
                      {filteredRows.length !== detail.rows.length && ` de ${numberFormat.format(detail.rows.length)}`}{" "}
                      registros
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-ink-soft/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Buscar en la tabla…"
                      className="h-9 w-[220px] max-w-full rounded-lg border border-line bg-card pl-8 pr-3 text-[12px] text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-[12px]">
                    <thead className="bg-canvas-2/60 sticky top-0">
                      <tr>
                        {detail.columns.map((column) => {
                          const isSorted = sort?.key === column.key;
                          return (
                            <th
                              key={column.key}
                              scope="col"
                              className={cn(
                                "text-left font-bold uppercase tracking-wider text-[10px] text-ink-soft/75 px-3 py-2.5 whitespace-nowrap",
                                column.numeric && "text-right",
                                column.width,
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => toggleSort(column.key)}
                                className={cn(
                                  "inline-flex items-center gap-1 hover:text-ink transition-standard",
                                  column.numeric && "flex-row-reverse",
                                  isSorted && "text-brand",
                                )}
                              >
                                {column.label}
                                {isSorted &&
                                  (sort.dir === "asc" ? (
                                    <ArrowUp className="w-3 h-3" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3" />
                                  ))}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, index) => (
                        <tr
                          key={`${currentPage}-${index}`}
                          className="border-t border-line hover:bg-canvas-2/50 transition-colors"
                        >
                          {detail.columns.map((column) => {
                            const text = cellText(row[column.key]);
                            return (
                              <td
                                key={column.key}
                                className={cn(
                                  "px-3 py-2 text-ink align-top",
                                  column.numeric && "text-right tabular-nums",
                                  column.nowrap && "whitespace-nowrap",
                                )}
                                title={column.clamp ? text : undefined}
                              >
                                {column.clamp ? (
                                  <span className="line-clamp-2 max-w-[280px] inline-block align-top">{text}</span>
                                ) : (
                                  text
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {pageRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={detail.columns.length}
                            className="px-3 py-8 text-center text-ink-soft border-t border-line"
                          >
                            Sin registros que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-line bg-canvas-2/40">
                    <p className="text-[11px] text-ink-soft">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-ink-soft hover:text-ink hover:bg-card disabled:opacity-40 transition-standard"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-line text-ink-soft hover:text-ink hover:bg-card disabled:opacity-40 transition-standard"
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {detail.notes.length > 0 && (
                <ul className="space-y-1 text-[11px] text-ink-soft list-disc pl-4">
                  {detail.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
