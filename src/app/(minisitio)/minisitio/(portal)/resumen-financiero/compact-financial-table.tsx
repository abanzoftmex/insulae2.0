import { Fragment } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/utils/cn";

/**
 * Antes `components/reports/CompactFinancialTable.js` del minisitio: puerto exacto de
 * `CompactFinancialTable` + `renderRowLabel` + `TABLE_TONE` del resumen financiero del panel.
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
    headerBg: "bg-brand-mint/50",
    firstColBg: "bg-brand-mint/20",
    totalRowBg: "bg-brand-mint/40",
    textTone: "text-ink font-bold",
  },
  expense: {
    headerBg: "bg-amber-500/10",
    firstColBg: "bg-amber-500/[0.03]",
    totalRowBg: "bg-amber-500/10",
    textTone: "text-ink font-bold",
  },
  balance: {
    headerBg: "bg-gold-soft",
    firstColBg: "bg-gold-soft/30",
    totalRowBg: "bg-gold-soft",
    textTone: "text-ink font-bold",
  },
} satisfies Record<string, TableTone>;

export function renderRowLabel(label: string, isTotal: boolean, textToneClass?: string) {
  if (isTotal) {
    return (
      <span className={cn("text-[12px] font-bold", textToneClass)}>{label}</span>
    );
  }
  const match = String(label ?? "").match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (match) {
    const title = match[1].trim();
    const subtitle = match[2].trim();
    return (
      <div className="flex flex-col py-1">
        <span className="text-[12px] font-bold text-ink leading-snug">{title}</span>
        <span className="text-[9px] font-bold text-ink-soft/75 mt-0.5">{subtitle}</span>
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
  return (
    <Card className="overflow-hidden border-transparent shadow-layered">
      <CardHeader className="px-4 py-3 border-b border-line bg-card">
        <div className="flex flex-col">
          <CardTitle className="text-[10px] font-bold text-ink-soft/60">
            {title}
          </CardTitle>
          <h2 className="text-sm font-bold text-brand mt-0.5">{subtitle}</h2>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-hidden no-scrollbar">
          <table className="w-full text-left border-collapse min-w-480">
            <thead>
              <tr className="h-9 bg-canvas/30 border-b border-line text-[10px] font-bold text-ink-soft/70">
                <th
                  style={{ minWidth: "260px", width: "260px" }}
                  className={cn(
                    "sticky left-0 z-30 px-4 border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]",
                    tone.headerBg,
                    tone.textTone
                  )}
                >
                  {firstColumnLabel}
                </th>
                {table.years.map((year) => (
                  <Fragment key={`head-${year}`}>
                    <th className={cn("px-4 text-right border-r border-line", tone.headerBg, tone.textTone)}>
                      {annualLabelPrefix} {year}
                    </th>
                    {monthLabels.map((m) => (
                      <th
                        key={`head-${year}-${m}`}
                        className="px-3 text-right border-r border-line/50 font-bold opacity-60"
                      >
                        {m} {year}
                      </th>
                    ))}
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/30">
              {table.rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn("h-10 hover:bg-canvas/10 transition-colors", row.isTotal && tone.totalRowBg)}
                >
                  <td
                    style={{ minWidth: "260px", width: "260px" }}
                    className={cn(
                      "sticky left-0 px-4 border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]",
                      row.isTotal ? tone.textTone : tone.firstColBg
                    )}
                  >
                    {renderRowLabel(row.label, row.isTotal, row.isTotal ? tone.textTone : undefined)}
                  </td>
                  {row.yearly.map((yearSlice) => (
                    <Fragment key={`body-${row.id}-${yearSlice.year}`}>
                      <td className="px-4 text-right text-[12px] font-bold border-r border-line text-ink">
                        {yearSlice.annualTotal}
                      </td>
                      {yearSlice.months.map((val, idx) => (
                        <td
                          key={`val-${row.id}-${yearSlice.year}-${idx}`}
                          className="px-3 text-right text-[12px] font-medium text-ink-soft border-r border-line/30"
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
