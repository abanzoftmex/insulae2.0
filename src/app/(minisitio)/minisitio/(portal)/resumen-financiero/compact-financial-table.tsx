import { Fragment } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/shared/utils/cn";

/**
 * Antes `components/reports/CompactFinancialTable.js` del minisitio: puerto de
 * `CompactFinancialTable` + `renderRowLabel` + `TABLE_TONE` del resumen financiero del panel
 * (`src/app/(admin)/resumen-financiero/page.tsx`), con sus mismas clases. Los tonos `ledger`
 * reproducen las dos tablas que el panel arma a mano: la roja de egresos ordinarios y la
 * dorada del saldo ordinario.
 *
 * Dos diferencias a propósito, sin cambio visual: la tabla usa `border-separate` (con
 * `border-collapse` los bordes de la columna fija se quedaban atrás al desplazar) y las celdas
 * fijas llevan el tono ya mezclado con blanco, opaco, para que las cifras no se vean a través.
 * Sobre la tarjeta blanca es el mismo color que el `/20`, `/40`… del panel.
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
  /** Tabla "de libro": todo el encabezado en el tono, etiquetas lisas y total en el color del tono. */
  ledger?: boolean;
  headerBg: string;
  headerText: string;
  firstColBg: string;
  totalRowBg: string;
  totalRowText: string;
  subtitle: string;
  /** Total anual en olivo si es ≥ 0 y en rojo si es negativo. */
  signedAnnual?: boolean;
}

export const TABLE_TONE = {
  income: {
    headerBg: "bg-[color-mix(in_srgb,var(--color-brand-mint)_50%,white)]",
    headerText: "text-ink font-bold",
    firstColBg: "bg-[color-mix(in_srgb,var(--color-brand-mint)_20%,white)]",
    totalRowBg: "bg-[color-mix(in_srgb,var(--color-brand-mint)_40%,white)]",
    totalRowText: "text-ink font-bold",
    subtitle: "text-brand",
  },
  expense: {
    headerBg: "bg-[color-mix(in_srgb,var(--color-amber-500)_10%,white)]",
    headerText: "text-ink font-bold",
    firstColBg: "bg-[color-mix(in_srgb,var(--color-amber-500)_3%,white)]",
    totalRowBg: "bg-[color-mix(in_srgb,var(--color-amber-500)_10%,white)]",
    totalRowText: "text-ink font-bold",
    subtitle: "text-brand",
  },
  balance: {
    headerBg: "bg-gold-soft",
    headerText: "text-ink font-bold",
    firstColBg: "bg-[color-mix(in_srgb,var(--color-gold-soft)_30%,white)]",
    totalRowBg: "bg-gold-soft",
    totalRowText: "text-ink font-bold",
    subtitle: "text-brand",
  },
  /** "Corte mensual" de egresos ordinarios del panel. */
  ordinaryExpense: {
    ledger: true,
    headerBg: "bg-[color-mix(in_srgb,var(--color-danger)_10%,white)]",
    headerText: "text-danger",
    firstColBg: "bg-[color-mix(in_srgb,var(--color-danger)_2%,white)]",
    totalRowBg: "bg-[color-mix(in_srgb,var(--color-danger)_10%,white)]",
    totalRowText: "text-danger font-bold",
    subtitle: "text-danger",
  },
  /** Saldo ingresos − egresos ordinarios del panel. */
  ordinaryBalance: {
    ledger: true,
    headerBg: "bg-gold-soft",
    headerText: "text-gold",
    firstColBg: "bg-[color-mix(in_srgb,var(--color-gold-soft)_20%,white)]",
    totalRowBg: "bg-gold-soft",
    totalRowText: "text-gold font-bold",
    subtitle: "text-gold",
    signedAnnual: true,
  },
} satisfies Record<string, TableTone>;

export function renderRowLabel(label: string, isTotal: boolean, textToneClass?: string) {
  if (isTotal) {
    return (
      <span className={cn("text-[12px] font-bold uppercase tracking-wider", textToneClass)}>{label}</span>
    );
  }
  const match = String(label ?? "").match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (match) {
    const title = match[1].trim();
    const subtitle = match[2].trim();
    return (
      <div className="flex flex-col py-1">
        <span className="text-[12px] font-bold text-ink leading-snug">{title}</span>
        <span className="text-[9px] font-bold text-ink-soft/75 uppercase tracking-wider mt-0.5">{subtitle}</span>
      </div>
    );
  }
  return <span className="text-[12px] font-bold text-ink leading-snug">{label}</span>;
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
  const sticky =
    "sticky left-0 w-[260px] min-w-[260px] px-4 border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]";

  return (
    // `isolate`: las celdas fijas no pasan por encima del encabezado del portal al desplazar.
    <Card className="isolate overflow-hidden border-transparent shadow-layered">
      <CardHeader className="px-4 py-3 border-b border-line bg-card">
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase leading-none tracking-widest text-ink-soft/60">{title}</p>
          <h3 className={cn("text-sm font-bold uppercase mt-0.5", tone.subtitle)}>{subtitle}</h3>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left border-separate border-spacing-0 min-w-480">
            <thead>
              <tr
                className={cn(
                  "h-9 text-[10px] font-bold uppercase tracking-tighter",
                  tone.ledger ? cn(tone.headerBg, tone.headerText) : "bg-canvas/30 text-ink-soft/70"
                )}
              >
                <th scope="col" className={cn(sticky, "z-20 border-b", tone.headerBg, tone.headerText)}>
                  {firstColumnLabel}
                </th>
                {table.years.map((year) => (
                  <Fragment key={`head-${year}`}>
                    <th
                      scope="col"
                      className={cn("whitespace-nowrap px-4 text-right border-b border-r border-line", tone.headerBg, tone.headerText)}
                    >
                      {annualLabelPrefix} {year}
                    </th>
                    {monthLabels.map((m) => (
                      <th
                        key={`head-${year}-${m}`}
                        scope="col"
                        className={cn(
                          "whitespace-nowrap px-3 text-right border-b border-line border-r border-r-line/50 font-bold opacity-60",
                          tone.ledger && "text-ink-soft"
                        )}
                      >
                        {m} {year}
                      </th>
                    ))}
                  </Fragment>
                ))}
              </tr>
            </thead>
            {/* Separadores entre renglones: el `divide-y divide-line/30` del panel, en las celdas. */}
            <tbody className={cn("[&>tr+tr>*]:border-t [&>tr+tr>*]:border-t-line/30", tone.ledger && "text-[12px]")}>
              {table.rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "h-10 hover:bg-canvas/10 transition-colors",
                    row.isTotal && tone.totalRowBg,
                    row.isTotal && tone.ledger && tone.totalRowText
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      sticky,
                      "z-10 text-left",
                      tone.ledger ? "font-bold" : "font-normal",
                      row.isTotal ? cn(tone.totalRowBg, tone.totalRowText) : tone.firstColBg
                    )}
                  >
                    {tone.ledger
                      ? row.label
                      : renderRowLabel(row.label, row.isTotal, row.isTotal ? tone.totalRowText : undefined)}
                  </th>
                  {row.yearly.map((yearSlice) => (
                    <Fragment key={`body-${row.id}-${yearSlice.year}`}>
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 text-right font-bold border-r border-line",
                          !tone.ledger && "text-[12px] text-ink",
                          tone.signedAnnual && (yearSlice.annualTotalValue >= 0 ? "text-brand" : "text-danger")
                        )}
                      >
                        {yearSlice.annualTotal}
                      </td>
                      {yearSlice.months.map((val, idx) => (
                        <td
                          key={`val-${row.id}-${yearSlice.year}-${idx}`}
                          className={cn(
                            "whitespace-nowrap px-3 text-right text-ink-soft border-r border-line/30",
                            !tone.ledger && "text-[12px] font-medium"
                          )}
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
      </CardContent>
    </Card>
  );
}
