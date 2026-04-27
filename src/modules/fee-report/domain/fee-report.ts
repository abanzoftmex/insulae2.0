// ─────────────────────────────────────────────────────────────────────────────
// FEE REPORT DOMAIN — Reporte de Cuotas Ordinarias
//
// Runtime: solo Neon. Sin legacy. Sin fallback.
// ─────────────────────────────────────────────────────────────────────────────

/** Años a incluir en el reporte (año primario = actual, secundario = siguiente) */
export interface FeeReportFilter {
  primaryYear: number;
  secondaryYear: number;
  /** Página actual (1-indexed). Default: 1 */
  page?: number;
  /** Áreas por página. Default: 20 */
  pageSize?: number;
  /** Tipo de reporte (para saber qué ChargeGroups y cargos mapear). Por defecto ORDINARY */
  reportType?: "ORDINARY" | "EXTRAORDINARY";
}

/** Pago real registrado para un mes específico (de PaymentDetail) */
export interface FeeReportMonthlyCell {
  month: number;   // 1–12
  year: number;
  ownerAmount: number;     // OWNER responsibility
  commerceAmount: number;  // COMMERCE responsibility
}

/** Datos de cuota para un grupo de cobro ordinario en un año */
export interface FeeReportYearCharge {
  year: number;
  /** Monto mensual (del último Charge vigente para cada responsabilidad) */
  ownerMonthlyAmount: number;
  ownerAnnualAmount: number;
  commerceMonthlyAmount: number;
  commerceAnnualAmount: number;
  /** Saldo pendiente (OPEN|PARTIAL) del año */
  ownerBalance: number;
  commerceBalance: number;
}

/** Fila del reporte: una Área Privativa (APoLe o FAP) */
export interface FeeReportRow {
  id: string;
  code: string | null;
  name: string;
  status: string;
  statusCss: string;
  sortOrder: number;
  /** null = área raíz (AP), string = id del padre (FAP) */
  parentId: string | null;
  isFusion: boolean;
  /** Cartera vencida antes del año primario (status OPEN|PARTIAL, periodYear < primaryYear) */
  pastDueOwner: number;
  pastDueCommerce: number;
  /** Pagos efectivamente realizados en el año previo al primario */
  prepaidPrevYearOwner: number;
  prepaidPrevYearCommerce: number;
  /** Datos de cuota por año [primaryYear, secondaryYear] */
  yearCharges: FeeReportYearCharge[];
  /** Saldo actual total (suma de owner + commerce) */
  totalCurrentBalance: number;
  /** Saldo actual solo Propietario (cartera+primaryYear+elapsedSecondary) */
  totalOwnerBalance: number;
  /** Saldo actual solo Comercio (cartera+primaryYear+elapsedSecondary) */
  totalCommerceBalance: number;
  /** Tiene arrendamiento activo? */
  hasActiveRental: boolean;
  /** Pagos por mes, para cada año del reporte */
  monthlyPayments: FeeReportMonthlyCell[];
}

/** Resultado completo del reporte */
export interface FeeReportListing {
  condominiumId: string;
  condominiumName: string;
  primaryYear: number;
  secondaryYear: number;
  previousYear: number;
  rows: FeeReportRow[];
  /** Totales globales por columna (solo sobre la página actual) */
  totals: FeeReportTotals;
  /** Máximo createdAt de los Charges, para mostrar "Última actualización" */
  lastUpdatedAt: Date | null;
  /** Paginación */
  totalAreas: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Totales de columna para la fila de subtotales */
export interface FeeReportTotals {
  pastDueOwner: number;
  pastDueCommerce: number;
  prepaidPrevYearOwner: number;
  prepaidPrevYearCommerce: number;
  yearCharges: {
    year: number;
    ownerAnnualAmount: number;
    ownerMonthlyAmount: number;
    commerceAnnualAmount: number;
    commerceMonthlyAmount: number;
    ownerBalance: number;
    commerceBalance: number;
  }[];
  totalCurrentBalance: number;
  monthlyCells: FeeReportMonthlyCell[];
}
