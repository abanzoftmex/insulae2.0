import type { Metadata } from "next";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import { Fragment } from "react";

import {
  getFinancialSummaryUseCase,
  toFinancialSummaryVM,
} from "@/modules/financial-summary";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-financial-display",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-financial-body",
});

export const metadata: Metadata = {
  title: "Resumen Financiero | Insulae 2.0",
  description:
    "Resumen financiero anual de Valquirico con consolidado mensual de ingresos, egresos y balance.",
};

export const dynamic = "force-dynamic";

export default async function ResumenFinancieroPage() {
  const selectedYear = new Date().getUTCFullYear() - 1;

  const summary = await getFinancialSummaryUseCase.execute({ year: selectedYear });
  const vm = summary ? toFinancialSummaryVM(summary) : null;
  const ordinaryExpenseYears = vm?.ordinaryExpensesLegacyTable.years ?? [];
  const ordinaryExpenseBaseYear = ordinaryExpenseYears[0] ?? selectedYear;
  const ordinaryExpenseNextYear = ordinaryExpenseYears[1] ?? selectedYear + 1;
  const receivableCurrentYear = vm?.ordinaryReceivablesTable.currentYear ?? selectedYear;
  const receivableNextYear = vm?.ordinaryReceivablesTable.nextYear ?? selectedYear + 1;
  const receivableOverdueStartYear =
    vm?.ordinaryReceivablesTable.overdueStartYear ?? selectedYear - 1;
  const receivableOverdueEndYear = vm?.ordinaryReceivablesTable.overdueEndYear ?? selectedYear - 1;
  const payableCurrentYear = vm?.ordinaryPayablesTable.currentYear ?? selectedYear;
  const payableNextYear = vm?.ordinaryPayablesTable.nextYear ?? selectedYear + 1;

  return (
    <main
      className={`${display.variable} ${body.variable} relative isolate min-h-screen overflow-x-clip bg-[#f2ede4] px-5 pb-16 pt-8 text-[#1f1512] sm:px-8 lg:px-12`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-9rem] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[#c26f3d]/18 blur-3xl" />
        <div className="absolute right-[-8rem] top-[8rem] h-[24rem] w-[24rem] rounded-full bg-[#3f7a73]/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.52),transparent_42%)]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[#b9a58f]/55 bg-[#fff6ea]/88 p-6 shadow-[0_18px_46px_rgba(44,27,17,0.14)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-[#7c4d31]/35 bg-[#7c4d31]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6f4028]">
                Financiero Fase 1
              </span>
              <h1 className="font-[var(--font-financial-display)] text-4xl leading-none text-[#2e221b] sm:text-5xl">
                Resumen Financiero
              </h1>
              <p className="max-w-3xl font-[var(--font-financial-body)] text-sm leading-relaxed text-[#5f4f43] sm:text-base">
                Consolidado anual de ingresos y egresos por bloques contables, alineado a la
                estructura historica del reporte legacy. Ambito fijo: Valquirico. Visualizacion
                multi-anual fija para 2024, 2025 y 2026.
              </p>
            </div>

            <div className="rounded-3xl border border-[#ccb299] bg-[#221913] p-5 text-[#f8ead9]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#eac8a5]">Corte del reporte</p>
              <p className="mt-2 font-[var(--font-financial-display)] text-3xl leading-tight">
                {vm?.selectedYear ?? selectedYear}
              </p>
              <p className="mt-2 text-xs text-[#edd2bd]/90">Generado: {vm?.generatedAtLabel ?? "--"}</p>
            </div>
          </div>

            <div className="mt-5">
              <span className="rounded-full border border-[#bca58f] bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3d2a20]">
                Años visibles: 2024 / 2025 / 2026
              </span>
            </div>
        </header>

        {vm ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "Ingresos ordinarios", value: vm.totals.ordinaryIncome },
                { label: "Ingresos extraordinarios", value: vm.totals.extraordinaryIncome },
                { label: "Otros ingresos", value: vm.totals.otherIncome },
                { label: "Ingresos totales", value: vm.totals.totalIncome },
                { label: "Egresos totales", value: vm.totals.totalExpenses },
                { label: "Balance anual", value: vm.totals.annualBalance },
              ].map((card) => {
                const isBalance = card.label === "Balance anual";
                const isPositiveBalance = vm.totals.annualBalanceValue >= 0;

                return (
                  <article
                    key={card.label}
                    className={`rounded-3xl border p-5 shadow-[0_14px_30px_rgba(35,25,18,0.09)] ${
                      isBalance
                        ? isPositiveBalance
                          ? "border-[#7ea687]/45 bg-[#edf8f1]"
                          : "border-[#c98d76]/45 bg-[#fff0ea]"
                        : "border-[#b39f87]/35 bg-[#fffaf2]/92"
                    }`}
                  >
                    <p className="font-[var(--font-financial-body)] text-xs uppercase tracking-[0.18em] text-[#85553a]">
                      {card.label}
                    </p>
                    <p className="mt-3 font-[var(--font-financial-display)] text-3xl leading-none text-[#2f221b]">
                      {card.value}
                    </p>
                  </article>
                );
              })}
            </section>

            <section className="space-y-6">
              <p className="rounded-full border border-[#c7b198] bg-[#fff3e5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#815239]">
                Condominio: {vm.condominiumName}
              </p>

              <article className="rounded-3xl border border-[#b59f87]/45 bg-[#fff9ef]/92 p-5 shadow-[0_16px_34px_rgba(39,26,19,0.09)] sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                      Corte mensual
                    </p>
                    <h2 className="mt-1 font-[var(--font-financial-display)] text-3xl text-[#2f221b]">
                      Balance de Cuotas Ordinarias
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a647f]">
                      {vm.ordinaryIncomeMultiYearTable.title}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-auto rounded-2xl border border-[#c5cde0] bg-white">
                  <table className="min-w-[130rem] border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#cad2e5] text-left">
                        <th className="sticky left-0 top-0 z-30 border-b border-r border-[#adc0df] bg-[#c3f7a0] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Tipo de ingreso
                        </th>
                        {vm.ordinaryIncomeMultiYearTable.years.map((year) => (
                          <Fragment key={`year-group-${year}`}>
                            <th
                              key={`annual-${year}`}
                              className="sticky top-0 z-20 border-b border-l border-r border-[#adc0df] bg-[#c3f7a0] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                            >
                              Ingreso anual {year}
                            </th>
                            {vm.monthLabels.map((monthLabel) => (
                              <th
                                key={`${year}-${monthLabel}`}
                                className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#cad2e5] px-3 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                              >
                                {monthLabel} {year}
                              </th>
                            ))}
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vm.ordinaryIncomeMultiYearTable.rows.map((row) => (
                        <tr
                          key={row.id}
                          className={row.isTotal ? "bg-[#b0e495]" : "odd:bg-[#f9fbff] even:bg-[#f2f6fd]"}
                        >
                          <td
                            className={`sticky left-0 border-b border-r border-[#bfd0ea] px-4 py-3 text-sm ${
                              row.isTotal
                                ? "bg-[#b0e495] font-semibold text-[#223044]"
                                : "bg-[#d7f5c5] font-semibold text-[#2c3138]"
                            }`}
                          >
                            {row.label}
                          </td>
                          {row.yearly.map((yearSlice) => (
                            <Fragment key={`${row.id}-${yearSlice.year}`}>
                              <td
                                key={`${row.id}-${yearSlice.year}-annual`}
                                className={`border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold ${
                                  yearSlice.annualTotalValue >= 0 ? "text-[#2f3842]" : "text-[#8a2f2f]"
                                }`}
                              >
                                {yearSlice.annualTotal}
                              </td>
                              {yearSlice.months.map((monthAmount, monthIndex) => (
                                <td
                                  key={`${row.id}-${yearSlice.year}-${monthIndex + 1}`}
                                  className={`border-b border-r border-[#bfd0ea] px-3 py-3 text-right text-sm ${
                                    row.isTotal ? "font-semibold text-[#2f3842]" : "text-[#3a4654]"
                                  }`}
                                >
                                  {monthAmount}
                                </td>
                              ))}
                            </Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-3xl border border-[#b59f87]/45 bg-[#fff9ef]/92 p-5 shadow-[0_16px_34px_rgba(39,26,19,0.09)] sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                      Corte mensual
                    </p>
                    <h2 className="mt-1 font-[var(--font-financial-display)] text-3xl text-[#2f221b]">
                      Balance de Cuotas Ordinarias
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a647f]">
                      {vm.ordinaryOtherIncomeMultiYearTable.title}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-auto rounded-2xl border border-[#c5cde0] bg-white">
                  <table className="min-w-[130rem] border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#cad2e5] text-left">
                        <th className="sticky left-0 top-0 z-30 border-b border-r border-[#adc0df] bg-[#c3f7a0] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Tipo de ingreso
                        </th>
                        {vm.ordinaryOtherIncomeMultiYearTable.years.map((year) => (
                          <Fragment key={`year-group-other-${year}`}>
                            <th
                              key={`annual-other-${year}`}
                              className="sticky top-0 z-20 border-b border-l border-r border-[#adc0df] bg-[#c3f7a0] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                            >
                              Ingreso anual {year}
                            </th>
                            {vm.monthLabels.map((monthLabel) => (
                              <th
                                key={`other-${year}-${monthLabel}`}
                                className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#cad2e5] px-3 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                              >
                                {monthLabel} {year}
                              </th>
                            ))}
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vm.ordinaryOtherIncomeMultiYearTable.rows.map((row) => (
                        <tr
                          key={row.id}
                          className={row.isTotal ? "bg-[#b0e495]" : "odd:bg-[#f9fbff] even:bg-[#f2f6fd]"}
                        >
                          <td
                            className={`sticky left-0 border-b border-r border-[#bfd0ea] px-4 py-3 text-sm ${
                              row.isTotal
                                ? "bg-[#b0e495] font-semibold text-[#223044]"
                                : "bg-[#d7f5c5] font-semibold text-[#2c3138]"
                            }`}
                          >
                            {row.label}
                          </td>
                          {row.yearly.map((yearSlice) => (
                            <Fragment key={`${row.id}-other-${yearSlice.year}`}>
                              <td
                                key={`${row.id}-other-${yearSlice.year}-annual`}
                                className={`border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold ${
                                  yearSlice.annualTotalValue >= 0 ? "text-[#2f3842]" : "text-[#8a2f2f]"
                                }`}
                              >
                                {yearSlice.annualTotal}
                              </td>
                              {yearSlice.months.map((monthAmount, monthIndex) => (
                                <td
                                  key={`${row.id}-other-${yearSlice.year}-${monthIndex + 1}`}
                                  className={`border-b border-r border-[#bfd0ea] px-3 py-3 text-right text-sm ${
                                    row.isTotal ? "font-semibold text-[#2f3842]" : "text-[#3a4654]"
                                  }`}
                                >
                                  {monthAmount}
                                </td>
                              ))}
                            </Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-3xl border border-[#b59f87]/45 bg-[#fff9ef]/92 p-5 shadow-[0_16px_34px_rgba(39,26,19,0.09)] sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                      Corte mensual
                    </p>
                    <h2 className="mt-1 font-[var(--font-financial-display)] text-3xl text-[#2f221b]">
                      Balance de Cuotas Ordinarias
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a647f]">
                      {vm.ordinaryExpensesLegacyTable.title}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-auto rounded-2xl border border-[#c5cde0] bg-white">
                  <table className="min-w-[120rem] border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#cad2e5] text-left">
                        <th className="sticky left-0 top-0 z-30 border-b border-r border-[#adc0df] bg-[#f0a9a9] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Tipo de egreso
                        </th>
                        <th className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#f0a9a9] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Egreso anual {ordinaryExpenseBaseYear}
                        </th>
                        {vm.monthLabels.map((monthLabel) => (
                          <th
                            key={`ordinary-expense-${ordinaryExpenseBaseYear}-${monthLabel}`}
                            className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#cad2e5] px-3 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                          >
                            {monthLabel} {ordinaryExpenseBaseYear}
                          </th>
                        ))}
                        <th className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#f0a9a9] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Egreso anual {ordinaryExpenseNextYear}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vm.ordinaryExpensesLegacyTable.rows.map((row) => {
                        const baseYearSlice =
                          row.yearly.find((yearSlice) => yearSlice.year === ordinaryExpenseBaseYear) ??
                          row.yearly[0];
                        const nextYearSlice =
                          row.yearly.find((yearSlice) => yearSlice.year === ordinaryExpenseNextYear) ??
                          row.yearly[row.yearly.length - 1];

                        return (
                          <tr
                            key={row.id}
                            className={row.isTotal ? "bg-[#f0a9a9]" : "odd:bg-[#f9fbff] even:bg-[#f2f6fd]"}
                          >
                            <td
                              className={`sticky left-0 border-b border-r border-[#bfd0ea] px-4 py-3 text-sm ${
                                row.isTotal
                                  ? "bg-[#f0a9a9] font-semibold text-[#223044]"
                                  : "bg-[#f5d6d6] font-semibold text-[#2c3138]"
                              }`}
                            >
                              {row.label}
                            </td>
                            <td className="border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold text-[#2f3842]">
                              {baseYearSlice?.annualTotal ?? "$0.00"}
                            </td>
                            {(baseYearSlice?.months ?? []).map((monthAmount, monthIndex) => (
                              <td
                                key={`${row.id}-legacy-expense-${ordinaryExpenseBaseYear}-${monthIndex + 1}`}
                                className={`border-b border-r border-[#bfd0ea] px-3 py-3 text-right text-sm ${
                                  row.isTotal ? "font-semibold text-[#2f3842]" : "text-[#3a4654]"
                                }`}
                              >
                                {monthAmount}
                              </td>
                            ))}
                            <td className="border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold text-[#2f3842]">
                              {nextYearSlice?.annualTotal ?? "$0.00"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-3xl border border-[#b59f87]/45 bg-[#fff9ef]/92 p-5 shadow-[0_16px_34px_rgba(39,26,19,0.09)] sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                      Corte mensual
                    </p>
                    <h2 className="mt-1 font-[var(--font-financial-display)] text-3xl text-[#2f221b]">
                      Balance de Cuotas Ordinarias
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a647f]">
                      {vm.ordinaryReceivablesTable.title}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-auto rounded-2xl border border-[#c5cde0] bg-white">
                  <table className="min-w-[130rem] border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#cad2e5] text-left">
                        <th className="sticky left-0 top-0 z-30 border-b border-r border-[#adc0df] bg-[#c3f7a0] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Tipo de ingreso
                        </th>
                        <th className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#c3f7a0] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Periodo {receivableCurrentYear}
                        </th>
                        <th className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#c3f7a0] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Cartera vencida {receivableOverdueStartYear}-{receivableOverdueEndYear}
                        </th>
                        {vm.monthLabels.map((monthLabel) => (
                          <th
                            key={`ordinary-receivable-${receivableCurrentYear}-${monthLabel}`}
                            className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#cad2e5] px-3 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                          >
                            {monthLabel} {receivableCurrentYear}
                          </th>
                        ))}
                        <th className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#c3f7a0] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Periodo {receivableNextYear}
                        </th>
                        {vm.monthLabels.map((monthLabel) => (
                          <th
                            key={`ordinary-receivable-${receivableNextYear}-${monthLabel}`}
                            className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#cad2e5] px-3 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                          >
                            {monthLabel} {receivableNextYear}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vm.ordinaryReceivablesTable.rows.map((row) => (
                        <tr
                          key={row.id}
                          className={row.isTotal ? "bg-[#b0e495]" : "odd:bg-[#f9fbff] even:bg-[#f2f6fd]"}
                        >
                          <td
                            className={`sticky left-0 border-b border-r border-[#bfd0ea] px-4 py-3 text-sm ${
                              row.isTotal
                                ? "bg-[#b0e495] font-semibold text-[#223044]"
                                : "bg-[#d7f5c5] font-semibold text-[#2c3138]"
                            }`}
                          >
                            {row.label}
                          </td>
                          <td className="border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold text-[#2f3842]">
                            {row.periodCurrentYear}
                          </td>
                          <td className="border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold text-[#2f3842]">
                            {row.overduePortfolio}
                          </td>
                          {row.monthsCurrentYear.map((monthAmount, monthIndex) => (
                            <td
                              key={`${row.id}-receivable-current-${monthIndex + 1}`}
                              className={`border-b border-r border-[#bfd0ea] px-3 py-3 text-right text-sm ${
                                row.isTotal ? "font-semibold text-[#2f3842]" : "text-[#3a4654]"
                              }`}
                            >
                              {monthAmount}
                            </td>
                          ))}
                          <td className="border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold text-[#2f3842]">
                            {row.periodNextYear}
                          </td>
                          {row.monthsNextYear.map((monthAmount, monthIndex) => (
                            <td
                              key={`${row.id}-receivable-next-${monthIndex + 1}`}
                              className={`border-b border-r border-[#bfd0ea] px-3 py-3 text-right text-sm ${
                                row.isTotal ? "font-semibold text-[#2f3842]" : "text-[#3a4654]"
                              }`}
                            >
                              {monthAmount}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-3xl border border-[#b59f87]/45 bg-[#fff9ef]/92 p-5 shadow-[0_16px_34px_rgba(39,26,19,0.09)] sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                      Corte mensual
                    </p>
                    <h2 className="mt-1 font-[var(--font-financial-display)] text-3xl text-[#2f221b]">
                      Balance de Cuotas Ordinarias
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a647f]">
                      {vm.ordinaryPayablesTable.title}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-auto rounded-2xl border border-[#c5cde0] bg-white">
                  <table className="min-w-[130rem] border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#cad2e5] text-left">
                        <th className="sticky left-0 top-0 z-30 border-b border-r border-[#adc0df] bg-[#f0a9a9] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Tipo de egreso
                        </th>
                        <th className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#f0a9a9] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Periodo {payableCurrentYear}
                        </th>
                        {vm.monthLabels.map((monthLabel) => (
                          <th
                            key={`ordinary-payable-${payableCurrentYear}-${monthLabel}`}
                            className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#cad2e5] px-3 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                          >
                            {monthLabel} {payableCurrentYear}
                          </th>
                        ))}
                        <th className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#f0a9a9] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Total anual {payableNextYear}
                        </th>
                        <th className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#f0a9a9] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                          Periodo {payableNextYear}
                        </th>
                        {vm.monthLabels.map((monthLabel) => (
                          <th
                            key={`ordinary-payable-${payableNextYear}-${monthLabel}`}
                            className="sticky top-0 z-20 border-b border-r border-[#adc0df] bg-[#cad2e5] px-3 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                          >
                            {monthLabel} {payableNextYear}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vm.ordinaryPayablesTable.rows.map((row) => (
                        <tr key={row.id} className="odd:bg-[#f9fbff] even:bg-[#f2f6fd]">
                          <td className="sticky left-0 border-b border-r border-[#bfd0ea] bg-[#f5d6d6] px-4 py-3 text-sm font-semibold text-[#2c3138]">
                            {row.label}
                          </td>
                          <td className="border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold text-[#2f3842]">
                            {row.periodCurrentYear}
                          </td>
                          {row.monthsCurrentYear.map((monthAmount, monthIndex) => (
                            <td
                              key={`${row.id}-payable-current-${monthIndex + 1}`}
                              className="border-b border-r border-[#bfd0ea] px-3 py-3 text-right text-sm text-[#3a4654]"
                            >
                              {monthAmount}
                            </td>
                          ))}
                          <td className="border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold text-[#2f3842]">
                            {row.totalAnnualNextYear}
                          </td>
                          <td className="border-b border-r border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold text-[#2f3842]">
                            {row.periodNextYear}
                          </td>
                          {row.monthsNextYear.map((monthAmount, monthIndex) => (
                            <td
                              key={`${row.id}-payable-next-${monthIndex + 1}`}
                              className="border-b border-r border-[#bfd0ea] px-3 py-3 text-right text-sm text-[#3a4654]"
                            >
                              {monthAmount}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              {vm.blocks.map((block) =>
                block.tables
                  .filter(
                    (table) =>
                      !(
                        block.id === "ordinary" &&
                        (
                          table.id === "ordinary-income" ||
                          table.id === "ordinary-other-income" ||
                          table.id === "ordinary-expenses"
                        )
                      ),
                  )
                  .map((table) => (
                <article
                  key={`${block.id}-${table.id}`}
                  className="rounded-3xl border border-[#b59f87]/45 bg-[#fff9ef]/92 p-5 shadow-[0_16px_34px_rgba(39,26,19,0.09)] sm:p-6"
                >
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a573c]">
                        Corte mensual
                      </p>
                      <h2 className="mt-1 font-[var(--font-financial-display)] text-3xl text-[#2f221b]">
                        {block.title}
                      </h2>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a647f]">
                        {table.title}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 overflow-auto rounded-2xl border border-[#c5cde0] bg-white shadow-[0_12px_24px_rgba(45,37,29,0.08)]">
                    <table className="min-w-[52rem] border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#cad2e5] text-left">
                          <th className="sticky left-0 top-0 z-30 border-b border-r border-[#adc0df] bg-[#cad2e5] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                            Concepto
                          </th>
                          {vm.monthLabels.map((monthLabel) => (
                            <th
                              key={`${table.id}-${monthLabel}`}
                              className="sticky top-0 z-20 border-b border-[#adc0df] bg-[#cad2e5] px-3 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]"
                            >
                              {monthLabel.slice(0, 3)}
                            </th>
                          ))}
                          <th className="sticky top-0 z-20 border-b border-l border-[#adc0df] bg-[#cad2e5] px-4 py-3 text-right text-[11px] uppercase tracking-[0.12em] text-[#243449]">
                            Total anual
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row) => (
                          <tr
                            key={row.id}
                            className={row.isTotal ? "bg-[#e8eefb]" : "odd:bg-[#f9fbff] even:bg-[#f2f6fd]"}
                          >
                            <td
                              className={`sticky left-0 border-b border-r border-[#bfd0ea] px-4 py-3 text-sm ${
                                row.isTotal
                                  ? "bg-[#e8eefb] font-semibold text-[#223044]"
                                  : "bg-inherit text-[#2c3138]"
                              }`}
                            >
                              {row.label}
                            </td>

                            {row.months.map((monthAmount, monthIndex) => (
                              <td
                                key={`${row.id}-${monthIndex + 1}`}
                                className={`border-b border-[#bfd0ea] px-3 py-3 text-right text-sm ${
                                  row.isTotal ? "font-semibold text-[#2f3842]" : "text-[#3a4654]"
                                }`}
                              >
                                {monthAmount}
                              </td>
                            ))}

                            <td
                              className={`border-b border-l border-[#bfd0ea] px-4 py-3 text-right text-sm font-semibold ${
                                row.annualTotalValue >= 0 ? "text-[#285f4a]" : "text-[#8a2f2f]"
                              }`}
                            >
                              {row.annualTotal}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              )))}
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-[#c8ad95] bg-[#fff8ef] p-6 text-center">
            <h2 className="font-[var(--font-financial-display)] text-3xl text-[#2f221a]">
              Sin condominio activo
            </h2>
            <p className="mt-2 font-[var(--font-financial-body)] text-sm text-[#68584c]">
              No se encontro informacion suficiente para construir el resumen financiero.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
