import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  ChevronRight,
  Info
} from "lucide-react";

import {
  getFinancialSummaryUseCase,
  toFinancialSummaryVM,
} from "@/modules/financial-summary";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { cn } from "@/shared/utils/cn";

export const metadata: Metadata = {
  title: "Resumen Financiero | Insulae 2.0",
  description: "Consolidado financiero anual con comparativa multi-anual y desglose mensual.",
};

export const dynamic = "force-dynamic";

type Mode = "ordinary" | "extraordinary";

type MultiYearRow = {
  id: string;
  label: string;
  isTotal: boolean;
  yearly: Array<{
    year: number;
    annualTotal: string;
    annualTotalValue: number;
    months: string[];
  }>;
};

type MultiYearTable = {
  title: string;
  years: number[];
  rows: MultiYearRow[];
};

type TableTone = {
  headerBg: string;
  firstColBg: string;
  totalRowBg: string;
  textTone: string;
};

const TABLE_TONE = {
  income: {
    headerBg: "bg-brand-mint/50",
    firstColBg: "bg-brand-mint/20",
    totalRowBg: "bg-brand-mint/40",
    textTone: "text-brand",
  },
  expense: {
    headerBg: "bg-danger/10",
    firstColBg: "bg-danger/[0.03]",
    totalRowBg: "bg-danger/10",
    textTone: "text-danger",
  },
  balance: {
    headerBg: "bg-gold-soft",
    firstColBg: "bg-gold-soft/30",
    totalRowBg: "bg-gold-soft",
    textTone: "text-gold",
  },
} as const;

function CompactFinancialTable({
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
  table: MultiYearTable;
  monthLabels: string[];
  tone: TableTone;
}) {
  return (
    <Card className="overflow-hidden border-transparent shadow-layered">
      <CardHeader className="px-4 py-3 border-b border-line bg-card">
        <div className="flex flex-col">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60">
            {title}
          </CardTitle>
          <h2 className="text-sm font-bold uppercase text-brand mt-0.5">{subtitle}</h2>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-hidden no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[120rem]">
            <thead>
              <tr className="h-9 bg-canvas/30 border-b border-line text-[10px] font-bold uppercase tracking-tighter text-ink-soft/70">
                <th className={cn("sticky left-0 z-30 px-4 border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]", tone.headerBg, tone.textTone)}>
                  {firstColumnLabel}
                </th>
                {table.years.map((year) => (
                  <Fragment key={`head-${year}`}>
                    <th className={cn("px-4 text-right border-r border-line", tone.headerBg, tone.textTone)}>
                      {annualLabelPrefix} {year}
                    </th>
                    {monthLabels.map((m) => (
                      <th key={`head-${year}-${m}`} className="px-3 text-right border-r border-line/50 font-bold opacity-60">
                        {m} {year}
                      </th>
                    ))}
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/30">
              {table.rows.map((row) => (
                <tr key={row.id} className={cn("h-10 hover:bg-canvas/10 transition-colors", row.isTotal && tone.totalRowBg)}>
                  <td className={cn(
                    "sticky left-0 px-4 text-[12px] font-bold border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]",
                    row.isTotal ? tone.textTone : tone.firstColBg
                  )}>
                    {row.label}
                  </td>
                  {row.yearly.map((yearSlice) => (
                    <Fragment key={`body-${row.id}-${yearSlice.year}`}>
                      <td className={cn(
                        "px-4 text-right text-[12px] font-bold border-r border-line",
                        yearSlice.annualTotalValue >= 0 ? "text-brand" : "text-danger"
                      )}>
                        {yearSlice.annualTotal}
                      </td>
                      {yearSlice.months.map((val, idx) => (
                        <td key={`val-${row.id}-${idx}`} className="px-3 text-right text-[12px] font-medium text-ink-soft border-r border-line/30">
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

export default async function ResumenFinancieroPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedMode: Mode = resolvedSearchParams.mode === "extraordinary" ? "extraordinary" : "ordinary";
  const showOrdinary = selectedMode === "ordinary";

  const selectedYear = new Date().getUTCFullYear() - 1;
  const summary = await getFinancialSummaryUseCase.execute({ year: selectedYear });
  const vm = summary ? toFinancialSummaryVM(summary) : null;

  if (!vm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
        <h2 className="text-lg font-bold uppercase tracking-tight">Sin condominio activo</h2>
        <p className="text-sm">No se encontró información financiera disponible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-brand">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1.5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold text-brand tracking-tighter uppercase">Resumen Financiero</h1>
            <Badge variant="brand" className="w-fit rounded-full px-4 py-2 text-[10px] tracking-widest">Fase 1 · BETA</Badge>
            <p className="text-ink-soft/80 text-[11px] font-bold uppercase tracking-tight">
              {vm.condominiumName} · Corte {vm.selectedYear} · {vm.generatedAtLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-canvas-2 rounded-lg border border-line/50">
          <Link
            href="?mode=ordinary"
            className={cn(
              "h-8 px-4 flex items-center rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all",
              showOrdinary ? "bg-card text-brand shadow-sm border border-line" : "text-ink-soft hover:text-ink"
            )}
          >
            Cuotas Ordinarias
          </Link>
          <Link
            href="?mode=extraordinary"
            className={cn(
              "h-8 px-4 flex items-center rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all",
              !showOrdinary ? "bg-card text-brand shadow-sm border border-line" : "text-ink-soft hover:text-ink"
            )}
          >
            Cuotas Extraordinarias
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Ingresos Ordinarios" value={vm.totals.ordinaryIncome} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard label="Extraordinarios" value={vm.totals.extraordinaryIncome} icon={<DollarSign className="h-3.5 w-3.5" />} />
        <StatCard label="Otros Ingresos" value={vm.totals.otherIncome} icon={<PlusIcon className="h-3.5 w-3.5" />} />
        <StatCard label="Ingresos Totales" value={vm.totals.totalIncome} icon={<TrendingUp className="h-3.5 w-3.5" />} className="bg-brand-mint/20 border-brand-mint" />
        <StatCard label="Egresos Totales" value={vm.totals.totalExpenses} icon={<TrendingDown className="h-3.5 w-3.5" />} />
        <StatCard 
          label="Balance Anual" 
          value={vm.totals.annualBalance} 
          icon={<Calendar className="h-3.5 w-3.5" />}
          className={cn(vm.totals.annualBalanceValue >= 0 ? "bg-brand-mint/40" : "bg-danger/10 border-danger/20")}
        />
      </div>

      {/* Context Info */}
      <div className="flex items-center gap-2 p-3 bg-canvas/40 border border-line/30 rounded-md">
        <Info className="h-4 w-4 text-brand-accent shrink-0" />
        <p className="text-[11px] font-bold text-ink-soft/70 leading-tight uppercase tracking-tight">
          Ambito: Valquirico · Datos consolidados de Neon · Periodo visual: 2024 / 2025 / 2026
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6">
        {showOrdinary ? (
          <>
            <CompactFinancialTable
              title="Balance Mensual"
              subtitle="Cuotas Ordinarias"
              firstColumnLabel="Tipo de Ingreso"
              annualLabelPrefix="Ingreso Anual"
              table={vm.ordinaryIncomeMultiYearTable}
              monthLabels={vm.monthLabels}
              tone={TABLE_TONE.income}
            />

            <CompactFinancialTable
              title="Balance Mensual"
              subtitle="Otros Ingresos Ordinarios"
              firstColumnLabel="Tipo de Ingreso"
              annualLabelPrefix="Ingreso Anual"
              table={vm.ordinaryOtherIncomeMultiYearTable}
              monthLabels={vm.monthLabels}
              tone={TABLE_TONE.income}
            />

            {/* Legacy Expense Table - custom layout because it has specific columns */}
            <Card className="overflow-hidden border-transparent shadow-layered">
              <CardHeader className="px-4 py-3 border-b border-line bg-card">
                <div className="flex flex-col">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60">
                    Corte Mensual
                  </CardTitle>
                  <h2 className="text-sm font-bold uppercase text-danger mt-0.5">{vm.ordinaryExpensesLegacyTable.title}</h2>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[110rem]">
                    <thead>
                      <tr className="h-9 bg-danger/10 border-b border-line text-[10px] font-bold uppercase tracking-tighter text-danger">
                        <th className="sticky left-0 z-30 px-4 border-r border-line bg-danger/10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Tipo de Egreso</th>
                        <th className="px-4 text-right border-r border-line">Egreso {vm.ordinaryExpensesLegacyTable.years[0]}</th>
                        {vm.monthLabels.map(m => <th key={m} className="px-3 text-right border-r border-line/50 font-bold opacity-60 text-ink-soft">{m} {vm.ordinaryExpensesLegacyTable.years[0]}</th>)}
                        <th className="px-4 text-right border-r border-line">Egreso {vm.ordinaryExpensesLegacyTable.years[1]}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/30 text-[12px]">
                      {vm.ordinaryExpensesLegacyTable.rows.map(row => {
                        const s1 = row.yearly[0];
                        const s2 = row.yearly[1];
                        return (
                          <tr key={row.id} className={cn("h-10 hover:bg-canvas/10", row.isTotal && "bg-danger/10 text-danger font-bold")}>
                            <td className={cn("sticky left-0 px-4 font-bold border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]", row.isTotal ? "bg-danger/10" : "bg-danger/[0.02]")}>{row.label}</td>
                            <td className="px-4 text-right font-bold border-r border-line">{s1?.annualTotal}</td>
                            {s1?.months.map((v, i) => <td key={i} className="px-3 text-right text-ink-soft border-r border-line/30">{v}</td>)}
                            <td className="px-4 text-right font-bold border-r border-line">{s2?.annualTotal}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Balances block */}
            {vm.blocks.filter(b => b.id === "ordinary").map(block => (
              block.tables.filter(t => t.id === "ordinary-balance").map(table => (
                <Card key={table.id} className="overflow-hidden border-transparent shadow-layered">
                  <CardHeader className="px-4 py-3 border-b border-line bg-card">
                    <div className="flex flex-col">
                      <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/60">{block.title}</CardTitle>
                      <h2 className="text-sm font-bold uppercase text-gold mt-0.5">{table.title}</h2>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[60rem]">
                        <thead>
                          <tr className="h-9 bg-gold-soft border-b border-line text-[10px] font-bold uppercase tracking-tighter text-gold">
                            <th className="sticky left-0 z-30 px-4 border-r border-line bg-gold-soft shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Saldo</th>
                            {vm.monthLabels.map(m => <th key={m} className="px-3 text-right border-r border-line/50 font-bold opacity-60 text-ink-soft">{m.slice(0, 3)}</th>)}
                            <th className="px-4 text-right border-r border-line">Total Anual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/30 text-[12px]">
                          {table.rows.map(row => (
                            <tr key={row.id} className={cn("h-10 hover:bg-canvas/10", row.isTotal && "bg-gold-soft text-gold font-bold")}>
                              <td className={cn("sticky left-0 px-4 font-bold border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]", row.isTotal ? "bg-gold-soft" : "bg-gold-soft/20")}>{row.label}</td>
                              {row.months.map((v, i) => <td key={i} className="px-3 text-right text-ink-soft border-r border-line/30">{v}</td>)}
                              <td className={cn("px-4 text-right font-bold", row.annualTotalValue >= 0 ? "text-brand" : "text-danger")}>{row.annualTotal}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))
            ))}

            {/* Receivables Table */}
            <CompactFinancialTable
              title="Control de Cartera"
              subtitle={vm.ordinaryReceivablesTable.title}
              firstColumnLabel="Tipo de Ingreso"
              annualLabelPrefix="Periodo"
              table={{
                title: vm.ordinaryReceivablesTable.title,
                years: [vm.ordinaryReceivablesTable.currentYear, vm.ordinaryReceivablesTable.nextYear],
                rows: vm.ordinaryReceivablesTable.rows.map(r => ({
                  id: r.id,
                  label: r.label,
                  isTotal: r.isTotal,
                  yearly: [
                    {
                      year: vm.ordinaryReceivablesTable.currentYear,
                      annualTotal: r.periodCurrentYear,
                      annualTotalValue: 0, // not used for color here
                      months: r.monthsCurrentYear
                    },
                    {
                      year: vm.ordinaryReceivablesTable.nextYear,
                      annualTotal: r.periodNextYear,
                      annualTotalValue: 0,
                      months: r.monthsNextYear
                    }
                  ]
                }))
              }}
              monthLabels={vm.monthLabels}
              tone={TABLE_TONE.income}
            />
          </>
        ) : (
          /* Extraordinary Mode Content */
          <div className="space-y-6">
            <CompactFinancialTable
              title="Balance Extraordinario"
              subtitle="Ingresos Extraordinarios"
              firstColumnLabel="Tipo de Ingreso"
              annualLabelPrefix="Total"
              table={vm.extraordinaryIncomeMultiYearTable}
              monthLabels={vm.monthLabels}
              tone={TABLE_TONE.income}
            />
            <CompactFinancialTable
              title="Balance Extraordinario"
              subtitle="Egresos Extraordinarios"
              firstColumnLabel="Tipo de Egreso"
              annualLabelPrefix="Total"
              table={vm.extraordinaryExpensesMultiYearTable}
              monthLabels={vm.monthLabels}
              tone={TABLE_TONE.expense}
            />
            <CompactFinancialTable
              title="Balance Extraordinario"
              subtitle="Saldo Consolidado"
              firstColumnLabel="Concepto"
              annualLabelPrefix="Periodo"
              table={vm.extraordinaryBalanceMultiYearTable}
              monthLabels={vm.monthLabels}
              tone={TABLE_TONE.balance}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}
