import { Fragment } from "react";
import { cn } from "@/shared/utils/cn";

/**
 * Antes `components/reports/CompactFinancialTable.js` del minisitio: puerto de
 * `CompactFinancialTable` + `renderRowLabel` + `TABLE_TONE` del resumen financiero del panel.
 *
 * La tabla usa `border-separate`: con `border-collapse` los bordes de la columna fija se
 * quedaban atrás al desplazar. Las celdas fijas llevan fondos opacos (mezcla del tono con el
 * blanco) para que las cifras no se vean a través.
 */
export interface FinancialTableYearSlice {
  year: number;
  annualTotal: string;
  annualTotalValue: number;
  months: string[];
}

export interface FinancialTableRow {
  id: string;
  label: string;
  isTotal: boolean;
  yearly: FinancialTableYearSlice[];
}

export interface FinancialTable {
  title: string;
  years: number[];
  rows: FinancialTableRow[];
}

export interface TableTone {
  headerBg: string;
  firstColBg: string;
  totalRowBg: string;
  textTone: string;
}

export const TABLE_TONE = {
  income: {
    headerBg: "bg-[color-mix(in_srgb,var(--color-brand-mint)_60%,white)]",
    firstColBg: "bg-[color-mix(in_srgb,var(--color-brand-mint)_22%,white)]",
    totalRowBg: "bg-[color-mix(in_srgb,var(--color-brand-mint)_42%,white)]",
    textTone: "text-fg font-bold",
  },
  expense: {
    headerBg: "bg-[color-mix(in_srgb,var(--color-terracotta)_9%,white)]",
    firstColBg: "bg-[color-mix(in_srgb,var(--color-terracotta)_3%,white)]",
    totalRowBg: "bg-[color-mix(in_srgb,var(--color-terracotta)_7%,white)]",
    textTone: "text-fg font-bold",
  },
  balance: {
    headerBg: "bg-[color-mix(in_srgb,var(--color-brand-accent)_18%,white)]",
    firstColBg: "bg-[color-mix(in_srgb,var(--color-brand-accent)_6%,white)]",
    totalRowBg: "bg-[color-mix(in_srgb,var(--color-brand-accent)_14%,white)]",
    textTone: "text-fg font-bold",
  },
} satisfies Record<string, TableTone>;

/** "$0.00" se atenúa (casi todos los meses lo son) y un importe negativo va en teja. */
function valueTone(value: string) {
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n) || n === 0) return "text-fg-4";
  return n < 0 ? "text-overdue" : "text-fg-2";
}

export function renderRowLabel(label: string, isTotal: boolean, textToneClass?: string) {
  if (isTotal) {
    return (
      <span className={cn("text-[13px] font-bold", textToneClass)}>{label}</span>
    );
  }
  const match = String(label ?? "").match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (match) {
    const title = match[1].trim();
    const subtitle = match[2].trim();
    return (
      <div className="flex flex-col py-1">
        <span className="text-[13px] font-medium leading-snug text-fg">{title}</span>
        <span className="mt-0.5 text-[12px] text-fg-3">{subtitle}</span>
      </div>
    );
  }
  return <span className="text-[13px] font-medium leading-snug text-fg">{label}</span>;
}

export function CompactFinancialTable({
  title,
  subtitle,
  firstColumnLabel,
  annualLabelPrefix,
  table,
  monthLabels,
  tone,
}: {
  title: string;
  subtitle: string;
  firstColumnLabel: string;
  annualLabelPrefix: string;
  table: FinancialTable;
  monthLabels: string[];
  tone: TableTone;
}) {
  const th = "h-11 border-b border-stroke-2 px-3 align-middle text-[12px] leading-4";
  const td = "border-b border-stroke-3 px-3 py-2.5 align-middle text-[12.5px] tabular-nums";

  return (
    // `isolate`: las celdas fijas (z-20) no pasan por encima del encabezado del portal al desplazar.
    <section className="isolate overflow-hidden rounded-2xl border border-stroke-2 bg-card">
      <div className="border-b border-stroke-2 px-5 py-4">
        <p className="text-[12.5px] font-medium text-fg-3">{title}</p>
        <h2 className="mt-0.5 text-[16px] font-semibold leading-6 text-fg">{subtitle}</h2>
      </div>
      {/* Con barra visible (delgada): sin ella nada indicaba que hay más meses a la derecha. */}
      <div className="scrollbar-slim overflow-x-auto overflow-y-hidden">
        <table className="w-full min-w-480 border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th
                scope="col"
                className={cn(
                  th,
                  "sticky left-0 z-20 w-[260px] min-w-[260px] border-r px-4 shadow-[4px_0_8px_-6px_rgb(61_60_34/0.25)]",
                  tone.headerBg,
                  tone.textTone
                )}
              >
                {firstColumnLabel}
              </th>
              {table.years.map((year) => (
                <Fragment key={`head-${year}`}>
                  <th scope="col" className={cn(th, "border-r px-4 text-right", tone.headerBg, tone.textTone)}>
                    {annualLabelPrefix} {year}
                  </th>
                  {monthLabels.map((m) => (
                    <th
                      key={`head-${year}-${m}`}
                      scope="col"
                      className={cn(th, "border-r border-r-stroke-3 bg-surface-2 text-right font-medium text-fg-3")}
                    >
                      {m} {year}
                    </th>
                  ))}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {table.rows.map((row) => (
              <tr key={row.id} className={cn("group", row.isTotal ? tone.totalRowBg : "transition-colors duration-100 hover:bg-surface-2")}>
                <th
                  scope="row"
                  className={cn(
                    td,
                    "sticky left-0 z-10 w-[260px] min-w-[260px] border-r border-r-stroke-2 px-4 text-left font-normal shadow-[4px_0_8px_-6px_rgb(61_60_34/0.25)]",
                    row.isTotal ? tone.totalRowBg : tone.firstColBg
                  )}
                >
                  {renderRowLabel(row.label, row.isTotal, row.isTotal ? tone.textTone : undefined)}
                </th>
                {row.yearly.map((yearSlice) => (
                  <Fragment key={`body-${row.id}-${yearSlice.year}`}>
                    <td className={cn(td, "whitespace-nowrap border-r border-r-stroke-2 px-4 text-right font-semibold text-fg")}>
                      {yearSlice.annualTotal}
                    </td>
                    {yearSlice.months.map((val, idx) => (
                      <td
                        key={`val-${row.id}-${yearSlice.year}-${idx}`}
                        className={cn(td, "whitespace-nowrap border-r border-r-stroke-3 text-right", row.isTotal ? "font-semibold text-fg" : valueTone(val))}
                      >
                        {val}
                      </td>
                    ))}
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
