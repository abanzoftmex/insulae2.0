import type { StatisticsReport } from "../domain/statistics";

const numberFormatter = new Intl.NumberFormat("es-MX");
const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function formatInt(value: number): string {
  return numberFormatter.format(Math.round(value));
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  const index = Number.parseInt(monthNumber, 10) - 1;
  return `${MONTH_LABELS[index] ?? monthNumber} ${year.slice(2)}`;
}

export interface StatisticsVM extends StatisticsReport {
  kpis: {
    label: string;
    value: string;
    hint?: string;
  }[];
  paymentsSeries: { label: string; count: number; amount: number }[];
  openingsSeries: { label: string; value: number }[];
  generatedAtLabel: string;
}

export function toStatisticsVM(report: StatisticsReport): StatisticsVM {
  const kpis: StatisticsVM["kpis"] = [
    { label: "Propietarios", value: formatInt(report.totalOwners), hint: `${formatInt(report.ownersWithMultipleAreas)} con más de un inmueble` },
    { label: "Inmuebles", value: formatInt(report.totalPrivateAreas), hint: `${formatInt(report.parentPrivateAreas)} predios · ${formatInt(report.childPrivateAreas)} unidades` },
    { label: "Negocios activos", value: formatInt(report.activeBusinesses), hint: `${formatInt(report.totalBusinesses)} registrados en total` },
    {
      label: "Giros comerciales",
      value: report.businessLinesCount !== null ? formatInt(report.businessLinesCount) : "—",
      hint:
        report.classifiedBusinesses !== null
          ? `${formatInt(report.classifiedBusinesses)} negocios clasificados`
          : "Catálogo pendiente de migrar",
    },
    { label: "Viviendas", value: formatInt(report.residentialAreas), hint: "Lofts, departamentos y casas" },
    { label: "Locales / servicios", value: formatInt(report.commercialAreas), hint: "Incluye hotelería y servicios" },
    { label: "Ocupación", value: formatPct(report.occupancy.rate), hint: `${formatInt(report.occupancy.occupied)} ocupados · ${formatInt(report.occupancy.unoccupied)} sin ocupar` },
    { label: "Con construcción", value: formatInt(report.builtAreas), hint: `${formatInt(report.unbuiltAreas)} lotes sin construir` },
  ];

  return {
    ...report,
    kpis,
    paymentsSeries: report.paymentsByMonth.map((point) => ({
      label: formatMonthLabel(point.month),
      count: point.count,
      amount: point.amount,
    })),
    openingsSeries: report.businessOpeningsByYear.map((point) => ({
      label: String(point.year),
      value: point.value,
    })),
    generatedAtLabel: report.generatedAt.toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    }),
  };
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}
