import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Info,
  Plus,
  Wallet,
} from "lucide-react";

import {
  getFinancialSummaryUseCase,
  toFinancialSummaryVM,
} from "@/modules/financial-summary";
import { getPrivateAreaListingUseCase } from "@/modules/private-areas";
import { StatCard } from "@/components/ui/stat-card";
import { FinancialChart } from "@/components/ui/financial-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { cn } from "@/shared/utils/cn";

function renderRowLabel(label: string, isTotal: boolean, textToneClass?: string) {
  if (isTotal) {
    return <span className={cn("text-[12px] font-bold uppercase tracking-wider", textToneClass)}>{label}</span>;
  }
  const match = label.match(/^([^(]+)\s*\(([^)]+)\)$/);
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
          <table className="w-full text-left border-collapse min-w-480">
            <thead>
              <tr className="h-9 bg-canvas/30 border-b border-line text-[10px] font-bold uppercase tracking-tighter text-ink-soft/70">
                <th 
                  style={{ minWidth: "260px", width: "260px" }}
                  className={cn("sticky left-0 z-30 px-4 border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]", tone.headerBg, tone.textTone)}
                >
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
  searchParams?: Promise<{ mode?: string; year?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedMode: Mode = resolvedSearchParams.mode === "extraordinary" ? "extraordinary" : "ordinary";
  const showOrdinary = selectedMode === "ordinary";

  const defaultYear = new Date().getUTCFullYear() - 1;
  const selectedYear = resolvedSearchParams.year ? parseInt(resolvedSearchParams.year, 10) : defaultYear;
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

  // Get sum of "Cuotas ordinarias (anual)"
  const privateAreaListing = await getPrivateAreaListingUseCase.execute({
    page: 1,
    pageSize: 10000,
    paginateByTopLevel: false,
  });

  let ordinaryAnnualSum = 0;
  if (privateAreaListing) {
    if (selectedYear === 2025) {
      ordinaryAnnualSum = privateAreaListing.summary.estimatedAnnualOrdinaryIncome;
    } else {
      for (const row of privateAreaListing.rows) {
        const key = `ordinary_${selectedYear}_annual` as keyof typeof row.financialCells;
        const annualCell = row.financialCells[key];
        if (annualCell) {
          const ownerVal = typeof annualCell.owner === "number" ? annualCell.owner : parseFloat(String(annualCell.owner).replace(/[^0-9.-]+/g, "")) || 0;
          const commVal = typeof annualCell.commerce === "number" ? annualCell.commerce : parseFloat(String(annualCell.commerce).replace(/[^0-9.-]+/g, "")) || 0;
          ordinaryAnnualSum += ownerVal + commVal;
        }
      }
    }
  }

  const extraordinaryChargesAggregate = await prisma.charge.aggregate({
    where: {
      periodYear: { gte: 2024 },
      status: { not: "CANCELED" },
      chargeGroup: {
        kind: { in: ["EXTRA_CONDO", "EXTRA_COMMERCE"] },
      },
    },
    _sum: { amount: true },
  });
  const extChargesTotalVal = Number(extraordinaryChargesAggregate._sum.amount ?? 0);

  // Dynamically extract values from multi-year tables
  const ordIncomeTotalRow = vm.ordinaryIncomeMultiYearTable.rows.find((r) => r.isTotal);
  const ordIncomeTotalSlice = ordIncomeTotalRow?.yearly.find((s) => s.year === vm.selectedYear);
  const ordIncomeValue = ordIncomeTotalSlice?.annualTotalValue ?? 0;
  const ordIncomeLabel = ordIncomeTotalSlice?.annualTotal ?? "$0.00";

  const ordOtherIncomeTotalRow = vm.ordinaryOtherIncomeMultiYearTable.rows.find((r) => r.isTotal);
  const ordOtherIncomeTotalSlice = ordOtherIncomeTotalRow?.yearly.find((s) => s.year === vm.selectedYear);
  const ordOtherIncomeValue = ordOtherIncomeTotalSlice?.annualTotalValue ?? 0;
  const ordOtherIncomeLabel = ordOtherIncomeTotalSlice?.annualTotal ?? "$0.00";

  const ordExpensesTotalRow = vm.ordinaryExpensesLegacyTable.rows.find((r) => r.isTotal);
  const ordExpensesTotalSlice = ordExpensesTotalRow?.yearly.find((s) => s.year === vm.selectedYear);
  const ordExpensesValue = ordExpensesTotalSlice?.annualTotalValue ?? 0;
  const ordExpensesLabel = ordExpensesTotalSlice?.annualTotal ?? "$0.00";

  const extIncomeTotalRow = vm.extraordinaryIncomeMultiYearTable.rows.find((r) => r.isTotal);
  const extIncomeTotalSlice = extIncomeTotalRow?.yearly.find((s) => s.year === vm.selectedYear);
  const extIncomeValue = extIncomeTotalSlice?.annualTotalValue ?? 0;
  const extIncomeLabel = extIncomeTotalSlice?.annualTotal ?? "$0.00";

  const extOtherIncomeTotalRow = vm.extraordinaryOtherIncomeMultiYearTable.rows.find((r) => r.isTotal);
  const extOtherIncomeTotalSlice = extOtherIncomeTotalRow?.yearly.find((s) => s.year === vm.selectedYear);
  const extOtherIncomeValue = extOtherIncomeTotalSlice?.annualTotalValue ?? 0;
  const extOtherIncomeLabel = extOtherIncomeTotalSlice?.annualTotal ?? "$0.00";

  const extExpensesTotalRow = vm.extraordinaryExpensesMultiYearTable.rows.find((r) => r.isTotal);
  const extExpensesTotalSlice = extExpensesTotalRow?.yearly.find((s) => s.year === vm.selectedYear);
  const extExpensesValue = extExpensesTotalSlice?.annualTotalValue ?? 0;
  const extExpensesLabel = extExpensesTotalSlice?.annualTotal ?? "$0.00";

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Calculate dynamic card variables
  let cardOrdIncome = "";
  let cardExtIncome = "";
  let cardOtherIncome = "";
  let cardTotalIncome = "";
  let cardTotalExpenses = "";
  let cardAnnualBalance = "";
  let balanceValue = 0;

  if (showOrdinary) {
    cardOrdIncome = ordIncomeLabel;
    cardOtherIncome = ordOtherIncomeLabel;
    const totalIncomeVal = ordIncomeValue + ordOtherIncomeValue;
    cardTotalIncome = formatCurrency(totalIncomeVal);
    cardTotalExpenses = ordExpensesLabel;
    balanceValue = totalIncomeVal - ordExpensesValue;
    cardAnnualBalance = formatCurrency(balanceValue);
  } else {
    cardExtIncome = extIncomeLabel;
    cardOtherIncome = extOtherIncomeLabel;
    const totalIncomeVal = extIncomeValue + extOtherIncomeValue;
    cardTotalIncome = formatCurrency(totalIncomeVal);
    cardTotalExpenses = extExpensesLabel;
    balanceValue = totalIncomeVal - extExpensesValue;
    cardAnnualBalance = formatCurrency(balanceValue);
  }

  const extIncomeAccumulatedSum = extIncomeTotalRow?.yearly
    .filter((s) => s.year >= 2024)
    .reduce((sum, s) => sum + s.annualTotalValue, 0) ?? 0;

  const ordIncomeAccumulatedSum = ordIncomeTotalRow?.yearly
    .filter((s) => s.year >= 2024)
    .reduce((sum, s) => sum + s.annualTotalValue, 0) ?? 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-brand">
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          {vm.availableYears.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-canvas-2 rounded-lg border border-line/50">
              {vm.availableYears.map((y) => (
                <Link
                  key={y}
                  href={`?mode=${selectedMode}&year=${y}`}
                  className={cn(
                    "h-8 px-3 flex items-center rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all",
                    vm.selectedYear === y ? "bg-card text-brand shadow-sm border border-line" : "text-ink-soft hover:text-ink"
                  )}
                >
                  {y}
                </Link>
              ))}
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-canvas-2 rounded-lg border border-line/50">
            <Link
              href={`?mode=ordinary&year=${vm.selectedYear}`}
              className={cn(
                "h-8 px-4 flex items-center rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all",
                showOrdinary ? "bg-card text-brand shadow-sm border border-line" : "text-ink-soft hover:text-ink"
              )}
            >
              Cuotas Ordinarias
            </Link>
            <Link
              href={`?mode=extraordinary&year=${vm.selectedYear}`}
              className={cn(
                "h-8 px-4 flex items-center rounded-md text-[10px] font-bold uppercase tracking-tighter transition-all",
                !showOrdinary ? "bg-card text-brand shadow-sm border border-line" : "text-ink-soft hover:text-ink"
              )}
            >
              Cuotas Extraordinarias
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {showOrdinary ? (
          <StatCard accent="brand" label="Ingresos Ordinarios" value={cardOrdIncome} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        ) : (
          <StatCard accent="cyan" label="Extraordinarios" value={cardExtIncome} icon={<DollarSign className="h-3.5 w-3.5" />} />
        )}
        <StatCard accent="lime" label="Otros Ingresos" value={cardOtherIncome} icon={<Plus className="h-3.5 w-3.5" />} />
        <StatCard accent="brand" label="Ingresos Totales" value={cardTotalIncome} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatCard accent="gold" label="Egresos Totales" value={cardTotalExpenses} icon={<TrendingDown className="h-3.5 w-3.5" />} />
        <StatCard
          accent={balanceValue >= 0 ? "emerald" : "gold"}
          label="Balance Anual"
          value={cardAnnualBalance}
          icon={<Calendar className="h-3.5 w-3.5" />}
        />
        {showOrdinary ? (
          <StatCard 
            accent="emerald" 
            label={`Cuotas Ord. ${vm.selectedYear} (Anual)`} 
            value={formatCurrency(ordinaryAnnualSum > 0 ? ordinaryAnnualSum : ordIncomeValue)} 
            icon={<Wallet className="h-3.5 w-3.5" />} 
          />
        ) : (
          <StatCard 
            accent="emerald" 
            label="Cuotas Extr. Cargadas (Desde 2024)" 
            value={formatCurrency(extChargesTotalVal > 0 ? extChargesTotalVal : extIncomeAccumulatedSum)} 
            icon={<Wallet className="h-3.5 w-3.5" />} 
          />
        )}
      </div>

      {/* Context Info */}
      <div className="flex items-center gap-2 p-3 bg-canvas/40 border border-line/30 rounded-md">
        <Info className="h-4 w-4 text-brand-accent shrink-0" />
        <p className="text-[11px] font-bold text-ink-soft/70 leading-tight uppercase tracking-tight">
          Ambito: Valquirico · Datos consolidados de Neon · Periodo visual: 2024 / 2025 / 2026
        </p>
      </div>

      {/* Actividad Financiera Chart Card */}
      {(() => {
        const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartData = (summary?.months ?? [])
          .filter((m) => m.totalIncome > 0 || m.totalExpenses > 0)
          .map((m) => ({
            month: MONTH_ABBR[(m.month - 1) % 12],
            ordinaryIncome: m.ordinaryIncome,
            extraordinaryIncome: m.extraordinaryIncome,
            otherIncome: m.otherIncome,
            totalIncome: m.totalIncome,
            ordinaryExpenses: m.ordinaryExpenses,
            extraordinaryExpenses: m.extraordinaryExpenses,
            totalExpenses: m.totalExpenses,
          }));

        return (
          <div className="w-full">
            <Card className="w-full shadow-layered">
              <CardHeader className="px-4 py-3 border-b border-brand/40 bg-brand rounded-t-card flex flex-col gap-0.5">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-white">
                  Actividad Financiera: Ingresos vs Gastos ({selectedYear})
                </CardTitle>
                <p className="text-[9px] text-white/70 font-semibold uppercase tracking-wider">
                  Comparativo mensual del flujo de caja (Recaudación de cuotas vs Egresos del condominio)
                </p>
              </CardHeader>
              <CardContent className="px-2 pb-3 pt-4">
                {chartData.length > 0 ? (
                  <FinancialChart data={chartData} />
                ) : (
                  <div className="flex items-center justify-center h-[160px] text-[12px] text-ink-soft/50 font-medium">
                    Sin movimientos registrados para {selectedYear}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Main Content Sections */}
      <div className="space-y-6">
        {showOrdinary ? (
          <>
            <CompactFinancialTable
              title="Balance Mensual"
              subtitle="Cuotas a Áreas Privativas (Cobranza Condominal)"
              firstColumnLabel="Tipo de Cobro"
              annualLabelPrefix="Ingreso Anual"
              table={vm.ordinaryIncomeMultiYearTable}
              monthLabels={vm.ordinaryMonthLabels}
              tone={TABLE_TONE.income}
            />

            <CompactFinancialTable
              title="Balance Mensual"
              subtitle="Otros Ingresos (Catálogo de Ingresos Diversos)"
              firstColumnLabel="Concepto de Ingreso"
              annualLabelPrefix="Ingreso Anual"
              table={vm.ordinaryOtherIncomeMultiYearTable}
              monthLabels={vm.ordinaryMonthLabels}
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
                  <table className="w-full text-left border-collapse min-w-440">
                    <thead>
                      <tr className="h-9 bg-danger/10 border-b border-line text-[10px] font-bold uppercase tracking-tighter text-danger">
                        <th className="sticky left-0 z-30 px-4 border-r border-line bg-danger/10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Tipo de Egreso</th>
                        <th className="px-4 text-right border-r border-line">Egreso {vm.ordinaryExpensesLegacyTable.years[0]}</th>
                        {vm.ordinaryMonthLabels.map(m => <th key={m} className="px-3 text-right border-r border-line/50 font-bold opacity-60 text-ink-soft">{m} {vm.ordinaryExpensesLegacyTable.years[0]}</th>)}
                        <th className="px-4 text-right border-r border-line">Egreso {vm.ordinaryExpensesLegacyTable.years[1]}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/30 text-[12px]">
                      {vm.ordinaryExpensesLegacyTable.rows.map(row => {
                        const s1 = row.yearly[0];
                        const s2 = row.yearly[1];
                        return (
                          <tr key={row.id} className={cn("h-10 hover:bg-canvas/10", row.isTotal && "bg-danger/10 text-danger font-bold")}>
                            <td className={cn("sticky left-0 px-4 font-bold border-r border-line shadow-[2px_0_5px_rgba(0,0,0,0.02)]", row.isTotal ? "bg-danger/10" : "bg-danger/2")}>{row.label}</td>
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
                      <table className="w-full text-left border-collapse min-w-240">
                        <thead>
                          <tr className="h-9 bg-gold-soft border-b border-line text-[10px] font-bold uppercase tracking-tighter text-gold">
                            <th className="sticky left-0 z-30 px-4 border-r border-line bg-gold-soft shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Saldo</th>
                            {vm.ordinaryMonthLabels.map(m => <th key={m} className="px-3 text-right border-r border-line/50 font-bold opacity-60 text-ink-soft">{m.slice(0, 3)}</th>)}
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
              monthLabels={vm.ordinaryMonthLabels}
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
              monthLabels={vm.extraordinaryIncomeMultiYearTable.monthLabels}
              tone={TABLE_TONE.income}
            />
            {vm.extraordinaryOtherIncomeMultiYearTable.rows.length > 0 && (
              <CompactFinancialTable
                title="Balance Extraordinario"
                subtitle="Otros Ingresos Extraordinarios"
                firstColumnLabel="Tipo de Ingreso"
                annualLabelPrefix="Total"
                table={vm.extraordinaryOtherIncomeMultiYearTable}
                monthLabels={vm.extraordinaryOtherIncomeMultiYearTable.monthLabels}
                tone={TABLE_TONE.income}
              />
            )}
            <CompactFinancialTable
              title="Balance Extraordinario"
              subtitle="Egresos Extraordinarios"
              firstColumnLabel="Tipo de Egreso"
              annualLabelPrefix="Total"
              table={vm.extraordinaryExpensesMultiYearTable}
              monthLabels={vm.extraordinaryExpensesMultiYearTable.monthLabels}
              tone={TABLE_TONE.expense}
            />
            <CompactFinancialTable
              title="Balance Extraordinario"
              subtitle="Saldo Consolidado"
              firstColumnLabel="Concepto"
              annualLabelPrefix="Periodo"
              table={vm.extraordinaryBalanceMultiYearTable}
              monthLabels={vm.extraordinaryBalanceMultiYearTable.monthLabels}
              tone={TABLE_TONE.balance}
            />
            {vm.extraordinaryReceivablesMultiYearTable.rows.length > 0 && (
              <CompactFinancialTable
                title="Control de Cartera"
                subtitle={vm.extraordinaryReceivablesMultiYearTable.title}
                firstColumnLabel="Tipo de Ingreso"
                annualLabelPrefix="Periodo"
                table={vm.extraordinaryReceivablesMultiYearTable}
                monthLabels={vm.extraordinaryReceivablesMultiYearTable.monthLabels}
                tone={TABLE_TONE.income}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}


