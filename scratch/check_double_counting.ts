import { getFinancialSummaryUseCase } from "../src/modules/financial-summary";

async function main() {
  const summary = await getFinancialSummaryUseCase.execute({ year: 2025 });
  if (!summary) return;

  console.log("=== Totals ===");
  console.log("Card otherIncome:", summary.totals.otherIncome);

  console.log("\n=== ordinaryOtherIncomeMultiYearTable Rows ===");
  const table = summary.ordinaryOtherIncomeMultiYearTable;
  for (const row of table.rows) {
    const slice2025 = row.yearly.find(s => s.year === 2025);
    console.log(`- Row: ${row.label} (${row.id}), isTotal: ${row.isTotal}`);
    console.log(`  2025 months:`, slice2025?.months);
    console.log(`  2025 annualTotal:`, slice2025?.annualTotal);
  }
}

main().catch(console.error);
