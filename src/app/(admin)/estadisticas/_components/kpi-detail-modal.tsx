"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { DetailChart } from "./detail-charts";
import { ACCENT_STYLES, KPI_ICONS, type KpiCardData } from "./kpi-grid";

const PAGE_SIZE = 50;
const numberFormat = new Intl.NumberFormat("es-MX");

function cellText(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  return typeof value === "number" ? numberFormat.format(value) : value;
}

export function KpiDetailModal({
  kpi,
  initialTab,
  filters,
  onClose,
}: {
  kpi: KpiCardData;
  initialTab?: KpiKey;
  filters: { zone: string | null; useType: string | null };
  onClose: () => void;
}) {
  const isGrouped = Boolean(kpi.secondary);
  const [activeTabKey, setActiveTabKey] = useState<KpiKey>(initialTab ?? kpi.key);
  const [detailCache, setDetailCache] = useState<Partial<Record<KpiKey, KpiDetail>>>({});
  const [loadingKey, setLoadingKey] = useState<KpiKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  const ActiveIcon = KPI_ICONS[activeTabKey] ?? KPI_ICONS[kpi.key];
  const tone = ACCENT_STYLES[kpi.accent ?? "plain"];

  // Fetch detail for activeTabKey if not in cache
  useEffect(() => {
    if (detailCache[activeTabKey]) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ kpi: activeTabKey });
    if (filters.zone) params.set("zona", filters.zone);
    if (filters.useType) params.set("uso", filters.useType);

    setLoadingKey(activeTabKey);
    setError(null);

    fetch(`/api/estadisticas/detalle?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "No se pudo cargar el detalle");
        }
        return response.json() as Promise<KpiDetail>;
      })
      .then((data) => {
        setDetailCache((prev) => ({ ...prev, [activeTabKey]: data }));
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        setLoadingKey(null);
      });

    return () => controller.abort();
  }, [activeTabKey, detailCache, filters.zone, filters.useType]);

  const detail = detailCache[activeTabKey] ?? null;

  const handleTabSwitch = useCallback((newKey: KpiKey) => {
    setActiveTabKey(newKey);
    setQuery("");
    setPage(1);
    setSort(null);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 260);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
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
    const safeTitle = detail.tableTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    XLSX.writeFile(workbook, `${safeTitle}_${stamp}.xlsx`);
  }, [detail, filteredRows]);

  // El contenido entra cuando el panel ya casi terminó de expandirse, para que
  // no se deforme durante el crecimiento de la tarjeta.
  const contentMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: { delay: 0.16, duration: 0.22 } },
        exit: { opacity: 0, transition: { duration: 0.08 } },
      };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-3 md:p-4" role="dialog" aria-modal="true">
      <motion.div
        className="absolute inset-0 bg-brand-deep/45 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        // Mismo layoutId que la tarjeta: Framer interpola posición y tamaño,
        // así que la tarjeta parece estirarse hasta llenar la pantalla.
        layoutId={reduceMotion ? undefined : `kpi-shell-${kpi.key}`}
        style={{ borderRadius: 16, backgroundColor: "#ffffff" }}
        initial={reduceMotion ? { opacity: 0 } : undefined}
        animate={reduceMotion ? { opacity: 1 } : undefined}
        exit={reduceMotion ? { opacity: 0 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 34, mass: 0.9 }}
        className="relative w-full h-full overflow-hidden flex flex-col shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
      >
        {/* La superficie es lo que viaja desde la tarjeta; su contenido entra con fundido */}
        <header className="shrink-0 border-b border-line px-4 sm:px-6 py-3.5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <motion.span
              key={activeTabKey}
              className="p-2.5 rounded-xl shrink-0"
              style={{
                backgroundColor:
                  activeTabKey === "commercial"
                    ? "#304854"
                    : activeTabKey === "businesses"
                    ? tone.icon
                    : tone.icon,
              }}
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.18 } }}
            >
              <ActiveIcon
                className="w-5 h-5"
                style={{
                  color: activeTabKey === "commercial" ? "#ffffff" : tone.card,
                }}
              />
            </motion.span>
            <div className="min-w-0">
              <motion.p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: tone.label }}
                initial={reduceMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.18 } }}
              >
                {isGrouped
                  ? activeTabKey === "businesses"
                    ? `${kpi.label} · Negocios activos`
                    : `${kpi.label} · ${kpi.secondary?.label ?? "Locales y servicios"}`
                  : kpi.label}
              </motion.p>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <motion.span
                  key={`val-${activeTabKey}`}
                  className="text-[26px] font-bold leading-none tracking-tight"
                  style={{
                    color: activeTabKey === "commercial" ? "#304854" : tone.value,
                  }}
                  initial={reduceMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.18 } }}
                >
                  {activeTabKey === "commercial" && kpi.secondary
                    ? kpi.secondary.value
                    : (detail?.headline?.[0]?.value ?? kpi.value)}
                </motion.span>
                <motion.h2 {...contentMotion} className="text-[13px] text-ink-soft truncate">
                  {detail?.subtitle ?? (loadingKey ? "Cargando detalle…" : "")}
                </motion.h2>
              </div>
            </div>
          </div>
          <motion.div {...contentMotion} className="flex items-center gap-2 shrink-0">
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
          </motion.div>
        </header>

        {isGrouped && (
          <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-canvas border-b border-line flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-canvas-2 rounded-xl border border-line">
              <button
                type="button"
                onClick={() => handleTabSwitch(kpi.key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none",
                  activeTabKey === kpi.key
                    ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/[0.04]"
                    : "text-ink-soft hover:text-ink hover:bg-black/[0.02]",
                )}
              >
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <KPI_ICONS.businesses className="w-3.5 h-3.5 text-amber-800" />
                <span>Negocios activos</span>
                <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold">
                  {kpi.value}
                </span>
              </button>

              {kpi.secondary && (
                <button
                  type="button"
                  onClick={() => handleTabSwitch(kpi.secondary!.key)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none",
                    activeTabKey === kpi.secondary.key
                      ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-black/[0.04]"
                      : "text-ink-soft hover:text-ink hover:bg-black/[0.02]",
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-700" />
                  <KPI_ICONS.commercial className="w-3.5 h-3.5 text-emerald-800" />
                  <span>{kpi.secondary.label}</span>
                  <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                    {kpi.secondary.value}
                  </span>
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-ink-soft">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand" />
              <span>
                {activeTabKey === "businesses"
                  ? "Censo y operación comercial registrada"
                  : "Predios y unidades con vocación comercial"}
              </span>
            </div>
          </div>
        )}

        <motion.div {...contentMotion} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 bg-[#f4f6f8]">
          {!detail && !error && (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3 text-ink-soft">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
              <p className="text-[13px]">Calculando estadísticas…</p>
            </div>
          )}

          {error && (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-7 h-7 text-danger" />
              <p className="text-[13px] text-ink font-semibold">{error}</p>
              <p className="text-[12px] text-ink-soft">Cierra el detalle e inténtalo de nuevo.</p>
            </div>
          )}

          {detail && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {detail.headline.map((stat, index) => {
                  const primaryColor = activeTabKey === "commercial" ? "#304854" : tone.value;
                  return (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-line/80 bg-card px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] relative overflow-hidden"
                    >
                      {/* El primer dato es el que da nombre al panel: se marca con el acento del KPI */}
                      {index === 0 && (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: primaryColor }} />
                      )}
                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-soft/70">{stat.label}</p>
                      <p
                        className="text-[23px] font-bold leading-none mt-1.5 tracking-tight"
                        style={{ color: index === 0 ? primaryColor : "rgba(0,0,0,0.87)" }}
                      >
                        {stat.value}
                      </p>
                      {stat.hint && <p className="text-[10.5px] text-ink-soft/80 mt-1 leading-tight">{stat.hint}</p>}
                    </div>
                  );
                })}
              </div>

              {detail.charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {detail.charts.map((chart) => (
                    <section
                      key={chart.title}
                      className={cn(
                        "rounded-xl border border-line/80 bg-card p-4 min-w-0 overflow-hidden flex flex-col",
                        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
                        chart.wide && "lg:col-span-2",
                      )}
                    >
                      <header className="mb-3.5">
                        <h3 className="text-[13px] font-bold text-ink leading-tight">{chart.title}</h3>
                        {chart.subtitle && (
                          <p className="text-[11px] text-ink-soft/85 mt-0.5 leading-snug">{chart.subtitle}</p>
                        )}
                      </header>
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <DetailChart chart={chart} />
                      </div>
                    </section>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-line/80 bg-card overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line bg-canvas-2/50">
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
                <div className="rounded-xl border border-gold/25 bg-gold-soft px-4 py-3">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-soft/80 mb-1.5">
                    Cómo leer estas cifras
                  </p>
                  <ul className="space-y-1 text-[11px] text-ink-soft list-disc pl-4 leading-relaxed">
                    {detail.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
