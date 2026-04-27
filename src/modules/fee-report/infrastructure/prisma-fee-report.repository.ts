// ─────────────────────────────────────────────────────────────────────────────
// PRISMA FEE REPORT REPOSITORY — Batch optimized + Paginación + Ordenamiento
//
// Runtime: SOLO Neon. Sin fallback. Sin legacy. Sin fs.readFile.
//
// Por qué "lastChargeAmounts" y no "AreaCharge":
//   El legacy deriva la cuota mensual/anual del ÚLTIMO registro en PAGOS.monto
//   (ORDER BY fechaPago DESC LIMIT 1 por área × responsabilidad).
//   En nuestro modelo, el equivalente es el Charge más reciente por
//   (privateAreaId, responsibility), que obtenemos con distinct + orderBy desc.
//   AreaCharge puede estar vacío tras la migración, Charge sí tiene los datos.
//
// Queries ejecutadas (8 totales, independiente del nº de áreas):
//   1. condominium
//   2. chargeGroup ORDINARY
//   3. allAreasMeta (solo id/parent/sortOrder — para ordenar y paginar)
//   4. allCharges (groupBy — balance y cartera vencida)
//   5. lastChargeAmounts (distinct — cuota mensual base por área×responsabilidad)
//   6. allAllocations (payments history — pagos mes a mes + anticipo)
//   7. allRentals
//   8. lastCharge (fecha última actualización)
// ─────────────────────────────────────────────────────────────────────────────
import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  FeeReportFilter,
  FeeReportListing,
  FeeReportMonthlyCell,
  FeeReportRow,
  FeeReportTotals,
  FeeReportYearCharge,
} from "../domain/fee-report";
import type { FeeReportRepository } from "../domain/fee-report.repository";

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ChargeRow = {
  privateAreaId: string;
  responsibility: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  _sum: {
    amount: { toNumber(): number } | null;
    paidAmount: { toNumber(): number } | null;
    discountAmount: { toNumber(): number } | null;
  };
};

type AllocationRow = {
  amount: { toNumber(): number };
  charge: {
    privateAreaId: string | null;
    responsibility: string;
    periodYear: number;
    periodMonth: number;
    /** Status del charge al que está ligada esta allocation */
    status: string;
  };
  payment: {
    paidAt: Date;
  };
};

/** Monto del charge más reciente (= tarifa base global) por (area, responsibility) */
type LastChargeAmount = {
  id: string;
  privateAreaId: string | null;
  responsibility: string;
  amount: { toNumber(): number };
};

type AreaMeta = {
  id: string;
  code: string | null;
  name: string;
  status: string;
  sortOrder: number;
  parentPrivateAreaId: string | null;
  isFusion: boolean;
};

// ─── helpers numéricos ────────────────────────────────────────────────────────

function dec(v: { toNumber(): number } | null | undefined): number {
  return v?.toNumber() ?? 0;
}

/** Balance del charge según datos del Charge (sin interest, para casos donde paidAmount está poblado) */
function chargeBalance(row: ChargeRow): number {
  return (
    dec(row._sum.amount) -
    dec(row._sum.paidAmount) -
    dec(row._sum.discountAmount)
    // Note: interest excluido — el legacy muestra "monto - montoAbonado - descuento"
  );
}

// ─── status label ─────────────────────────────────────────────────────────────

function statusLabel(status: string): { label: string; css: string } {
  const map: Record<string, { label: string; css: string }> = {
    UNASSIGNED:         { label: "Sin asignar",        css: "status-unassigned"   },
    AVAILABLE:          { label: "Disponible / Activo", css: "status-available"    },
    SOLD:               { label: "Inactivo",             css: "status-sold"         },
    UNDER_CONSTRUCTION: { label: "En construcción",     css: "status-construction" },
    RENTED:             { label: "Rentado",              css: "status-rented"       },
    DELINQUENT:         { label: "Moroso",               css: "status-delinquent"   },
  };
  return map[status] ?? { label: status, css: "status-default" };
}

// ─── condominium resolver ────────────────────────────────────────────────────

async function resolveCondominium() {
  return (
    (await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true, name: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }))
  );
}

// ─── ordenamiento jerárquico ──────────────────────────────────────────────────
// Orden: AP raíz (sortOrder, name) → FAPs de cada AP (sortOrder, name)
// Replica exactamente el comportamiento del legacy

function buildSortedHierarchy(areas: AreaMeta[]): AreaMeta[] {
  const roots = areas
    .filter((a) => !a.parentPrivateAreaId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const childrenByParent = new Map<string, AreaMeta[]>();
  for (const area of areas) {
    if (!area.parentPrivateAreaId) continue;
    const existing = childrenByParent.get(area.parentPrivateAreaId) ?? [];
    existing.push(area);
    childrenByParent.set(area.parentPrivateAreaId, existing);
  }
  for (const children of childrenByParent.values()) {
    children.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  const sorted: AreaMeta[] = [];
  for (const root of roots) {
    sorted.push(root);
    sorted.push(...(childrenByParent.get(root.id) ?? []));
  }
  return sorted;
}

// ─── main repository ─────────────────────────────────────────────────────────

export class PrismaFeeReportRepository implements FeeReportRepository {
  async getListing(filter: FeeReportFilter): Promise<FeeReportListing | null> {
    const { primaryYear, secondaryYear } = filter;
    const page     = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
    const previousYear = primaryYear - 1;
    const years = [primaryYear, secondaryYear];

    // ── Q1: Condominio ──────────────────────────────────────────────────────
    const condominium = await resolveCondominium();
    if (!condominium) return null;
    const condominiumId = condominium.id;

    // ── Q2: ChargeGroups (ORDINARY o EXTRAORDINARY) ───────────────────────
    const reportType = filter.reportType ?? "ORDINARY";
    const groupWhere = reportType === "ORDINARY" 
      ? { kind: "ORDINARY" } 
      : { kind: { in: ["EXTRA_CONDO", "EXTRA_COMMERCE"] } };

    const targetGroups = await prisma.chargeGroup.findMany({
      where: { condominiumId, ...(groupWhere as any), isActive: true },
      select: { id: true, name: true },
    });
    if (targetGroups.length === 0) return null;
    const chargeGroupIds = targetGroups.map(g => g.id);

    // ── Q3: Metadata ligera de TODAS las áreas (ordenar + paginar en memoria) ──
    const allAreasMeta = (await prisma.privateArea.findMany({
      where: { condominiumId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        sortOrder: true,
        parentPrivateAreaId: true,
        isFusion: true,
      },
    })) as AreaMeta[];

    const totalAreas = allAreasMeta.length;
    if (totalAreas === 0) {
      return buildEmptyListing(condominiumId, condominium.name, primaryYear, secondaryYear, previousYear, page, pageSize);
    }

    const sortedAreas = buildSortedHierarchy(allAreasMeta);
    const totalPages  = Math.max(1, Math.ceil(totalAreas / pageSize));
    const safePage    = Math.min(page, totalPages);
    const pageAreas   = sortedAreas.slice((safePage - 1) * pageSize, safePage * pageSize);
    const pageAreaIds = pageAreas.map((a) => a.id);

    // ── Q4: allCharges agrupados ───────────────────────────────────────────
    const allCharges = (await prisma.charge.groupBy({
      by: ["privateAreaId", "responsibility", "periodYear", "periodMonth", "status"],
      where: {
        condominiumId,
        privateAreaId: { in: pageAreaIds },
        chargeGroupId: { in: chargeGroupIds },
        isCollectible: true,
      },
      _sum: {
        amount: true,
        paidAmount: true,
        discountAmount: true,
      },
    })) as unknown as ChargeRow[];

    // ── Q5: lastChargeAmounts — tarifa base GLOBAL por área × responsabilidad ────
    // El legacy siempre muestra la tarifa MÁS RECIENTE (cualquier año) en las
    // columnas de anual y mensual. Así, 2025 y 2026 exhiben la misma cuota actual.
    // Equivale al legacy: 'SELECT TOP 1 monto ... ORDER BY fechaCreacion DESC'.
    const lastChargeAmounts = (await prisma.charge.findMany({
      where: {
        condominiumId,
        privateAreaId: { in: pageAreaIds },
        chargeGroupId: { in: chargeGroupIds },
        isCollectible: true,
        // Sin filtro de periodYear — tomamos el más reciente global
      },
      select: {
        id: true,
        privateAreaId: true,
        responsibility: true,
        amount: true,
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      distinct: ["privateAreaId", "responsibility"],
    })) as LastChargeAmount[];

    // Map: `${areaId}__${responsibility}` → monthly fee actual
    const lastAmountMap = new Map<string, number>();
    for (const row of lastChargeAmounts) {
      if (!row.privateAreaId) continue;
      lastAmountMap.set(`${row.privateAreaId}__${row.responsibility}`, dec(row.amount));
    }

    // ── Q6: PaymentAllocations — TODAS las allocations de charges isCollectible=true ─
    // Traemos ANY status del charge para conservar el historial mensual completo
    // (pagos de charges CANCELED forman parte del historial que el legacy muestra).
    // El filtro OPEN/PARTIAL se aplica en memoria solo al calcular balances.
    // legacyStatusCode=2 = pago revertido en legacy (activo_historico indirecto);
    // se excluye tanto del historial mensual como del cálculo de balance.
    const allAllocations = (await prisma.paymentAllocation.findMany({
      where: {
        charge: {
          condominiumId,
          chargeGroupId: { in: chargeGroupIds },
          privateAreaId: { in: pageAreaIds },
          isCollectible: true,
        },
        payment: { legacyStatusCode: { not: 2 } },
      },
      select: {
        amount: true,
        charge: {
          select: {
            privateAreaId: true,
            responsibility: true,
            periodYear: true,
            periodMonth: true,
            status: true,
          },
        },
        payment: { select: { paidAt: true } },
      },
    })) as AllocationRow[];

    // ── Q7: Rentals ─────────────────────────────────────────────────────────
    const allRentals = await prisma.rental.findMany({
      where: { condominiumId, privateAreaId: { in: pageAreaIds } },
      select: { privateAreaId: true },
    });

    // ── Q8: Última actualización ────────────────────────────────────────────
    const lastCharge = await prisma.charge.findFirst({
      where: { condominiumId, chargeGroupId: { in: chargeGroupIds } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    // ─── Resolución en memoria O(n) ───────────────────────────────────────
    const chargesByArea    = groupBy(allCharges, (c) => c.privateAreaId);
    const rentalAreaIds    = new Set(allRentals.map((r) => r.privateAreaId));
    const allocationsByArea = groupBy(allAllocations, (a) => a.charge.privateAreaId ?? "");

    const rows: FeeReportRow[] = pageAreas.map((area) => {
      const areaCharges    = chargesByArea.get(area.id) ?? [];
      const monthlyRaw     = allocationsByArea.get(area.id) ?? [];
      const hasActiveRental = rentalAreaIds.has(area.id);

      // ── Cuota mensual/anual base — tarifa GLOBAL más reciente ──────────────────
      function monthlyFee(responsibility: "OWNER" | "COMMERCE"): number {
        return lastAmountMap.get(`${area.id}__${responsibility}`) ?? 0;
      }

      // ── Saldo por año ───────────────────────────────────────────────────────────────
      // balance = SUM(Charge.amount - Charge.discountAmount) - SUM(PaymentAllocation.amount)
      // pero SOLO para allocations vinculadas a charges OPEN/PARTIAL (isCollectible=true).
      // Los pagos de charges CANCELED se excluyen del cálculo de saldo para
      // reproducir la fórmula del legacy: SUM(monto - montoAbonado) WHERE activo=1 AND status!=CANCELED.
      function computeYearBalance(
        responsibility: "OWNER" | "COMMERCE",
        year: number,
      ): number {
        const active = areaCharges.filter(
          (c) => c.responsibility === responsibility && c.periodYear === year &&
                 (c.status === "OPEN" || c.status === "PARTIAL")
        );
        const totalAmount   = active.reduce((s, c) => s + dec(c._sum.amount), 0);
        const totalDiscount = active.reduce((s, c) => s + dec(c._sum.discountAmount), 0);
        // Pagos SOLO para charges OPEN/PARTIAL (excluir CANCELED del paid)
        const totalPaid = monthlyRaw
          .filter((a) =>
            a.charge.responsibility === responsibility &&
            a.charge.periodYear     === year &&
            (a.charge.status === "OPEN" || a.charge.status === "PARTIAL")
          )
          .reduce((s, a) => s + a.amount.toNumber(), 0);
        return Math.max(0, totalAmount - totalDiscount - totalPaid);
      }

      // ── Cartera vencida — mismo enfoque: allocation-based balance ──────────
      function computePastDue(responsibility: "OWNER" | "COMMERCE"): number {
        const pastDue = areaCharges.filter(
          (c) => c.responsibility === responsibility && c.periodYear < primaryYear &&
                 (c.status === "OPEN" || c.status === "PARTIAL")
        );
        const totalAmount   = pastDue.reduce((s, c) => s + dec(c._sum.amount), 0);
        const totalDiscount = pastDue.reduce((s, c) => s + dec(c._sum.discountAmount), 0);
        const totalPaid = monthlyRaw
          .filter((a) =>
            a.charge.responsibility === responsibility &&
            a.charge.periodYear < primaryYear &&
            (a.charge.status === "OPEN" || a.charge.status === "PARTIAL")
          )
          .reduce((s, a) => s + a.amount.toNumber(), 0);
        return Math.max(0, totalAmount - totalDiscount - totalPaid);
      }

      const pastDueOwner    = computePastDue("OWNER");
      const pastDueCommerce = computePastDue("COMMERCE");

      // ── Pago anticipado año anterior (allocations pagadas en previousYear) ──
      // Para años anteriores al año primario (abonos hechos en previousYear)
      const prevYearAllocs = monthlyRaw.filter(
        (a) => a.payment.paidAt.getFullYear() === previousYear
      );
      const prepaidPrevYearOwner    = sumAllocs(prevYearAllocs, "OWNER");
      const prepaidPrevYearCommerce = sumAllocs(prevYearAllocs, "COMMERCE");

      // ── Cuota anual + saldo por año ────────────────────────────────────────
      const ownerM    = monthlyFee("OWNER");
      const commerceM = monthlyFee("COMMERCE");
      const yearCharges: FeeReportYearCharge[] = years.map((year) => ({
        year,
        ownerMonthlyAmount:    ownerM,
        ownerAnnualAmount:     ownerM * 12,
        commerceMonthlyAmount: commerceM,
        commerceAnnualAmount:  commerceM * 12,
        ownerBalance:          computeYearBalance("OWNER",    year),
        commerceBalance:       computeYearBalance("COMMERCE", year),
      }));

      // ── Saldo actual (total global) ───────────────────────────────────────
      // El legacy suma la cartera vencida + saldo del año primario + saldo de meses transcurridos del año secundario.
      // Legacy hace: AND P.fechaPago <= NOW()
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Calcular saldo aplicable al total global para un año dado limitando los meses si es el año en curso
      function computeElapsedYearBalance(responsibility: "OWNER" | "COMMERCE", year: number): number {
        // limitToMonth es 12 por defecto (todo el año), a menos que estemos evaluando el año en curso
        const limitToMonth = (year >= currentYear) ? currentMonth : 12;

        const active = areaCharges.filter(
          (c) => c.responsibility === responsibility && c.periodYear === year && c.periodMonth <= limitToMonth &&
                 (c.status === "OPEN" || c.status === "PARTIAL")
        );
        const totalAmount = active.reduce((s, c) => s + dec(c._sum.amount), 0);
        const totalDiscount = active.reduce((s, c) => s + dec(c._sum.discountAmount), 0);
        
        const totalPaid = monthlyRaw
          .filter((a) =>
            a.charge.responsibility === responsibility &&
            a.charge.periodYear === year &&
            a.charge.periodMonth <= limitToMonth &&
            (a.charge.status === "OPEN" || a.charge.status === "PARTIAL")
          )
          .reduce((s, a) => s + a.amount.toNumber(), 0);
          
        return Math.max(0, totalAmount - totalDiscount - totalPaid);
      }

      const elapsedSecOwner = computeElapsedYearBalance("OWNER", secondaryYear);
      const elapsedSecCommerce = computeElapsedYearBalance("COMMERCE", secondaryYear);
      const primaryYC = yearCharges.find((yc) => yc.year === primaryYear);

      const totalOwnerBalance = pastDueOwner + (primaryYC?.ownerBalance ?? 0) + elapsedSecOwner;
      const totalCommerceBalance = pastDueCommerce + (primaryYC?.commerceBalance ?? 0) + elapsedSecCommerce;
      const totalCurrentBalance  = totalOwnerBalance + totalCommerceBalance;

      // ── Pagos mensuales (24 celdas) — solo dentro del rango del reporte ────
      const reportStart = new Date(`${previousYear}-01-01T00:00:00`);
      const reportEnd   = new Date(`${secondaryYear}-12-31T23:59:59`);
      const rangeAllocs = monthlyRaw.filter((a) => {
        const d = a.payment.paidAt;
        return d >= reportStart && d <= reportEnd;
      });

      const monthlyPayments: FeeReportMonthlyCell[] = years.flatMap((year) =>
        Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const monthAllocs = rangeAllocs.filter((a) => {
            const d = a.payment.paidAt;
            return d.getFullYear() === year && d.getMonth() + 1 === month;
          });
          return {
            month,
            year,
            ownerAmount:    sumAllocs(monthAllocs, "OWNER"),
            commerceAmount: sumAllocs(monthAllocs, "COMMERCE"),
          };
        })
      );

      const { label, css } = statusLabel(area.status);
      return {
        id: area.id,
        code: area.code,
        name: area.name,
        status: label,
        statusCss: css,
        sortOrder: area.sortOrder,
        parentId: area.parentPrivateAreaId,
        isFusion: area.isFusion,
        pastDueOwner,
        pastDueCommerce,
        prepaidPrevYearOwner,
        prepaidPrevYearCommerce,
        yearCharges,
        totalCurrentBalance,
        totalOwnerBalance,
        totalCommerceBalance,
        hasActiveRental,
        monthlyPayments,
      };
    });

    return {
      condominiumId,
      condominiumName: condominium.name,
      primaryYear,
      secondaryYear,
      previousYear,
      rows,
      totals: buildTotals(rows, years),
      lastUpdatedAt: lastCharge?.createdAt ?? null,
      totalAreas,
      page: safePage,
      pageSize,
      totalPages,
    };
  }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    const existing = map.get(k);
    if (existing) existing.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function sumAllocs(allocations: AllocationRow[], responsibility: "OWNER" | "COMMERCE"): number {
  return allocations
    .filter((a) => a.charge.responsibility === responsibility)
    .reduce((s, a) => s + a.amount.toNumber(), 0);
}

// ─── Totales y vacíos ─────────────────────────────────────────────────────────

function buildEmptyListing(
  condominiumId: string,
  condominiumName: string,
  primaryYear: number,
  secondaryYear: number,
  previousYear: number,
  page: number,
  pageSize: number
): FeeReportListing {
  const years = [primaryYear, secondaryYear];
  return {
    condominiumId,
    condominiumName,
    primaryYear,
    secondaryYear,
    previousYear,
    rows: [],
    totals: buildEmptyTotals(years),
    lastUpdatedAt: null,
    totalAreas: 0,
    page,
    pageSize,
    totalPages: 0,
  };
}

function buildEmptyTotals(years: number[]): FeeReportTotals {
  return {
    pastDueOwner: 0,
    pastDueCommerce: 0,
    prepaidPrevYearOwner: 0,
    prepaidPrevYearCommerce: 0,
    yearCharges: years.map((year) => ({
      year,
      ownerAnnualAmount: 0,
      ownerMonthlyAmount: 0,
      commerceAnnualAmount: 0,
      commerceMonthlyAmount: 0,
      ownerBalance: 0,
      commerceBalance: 0,
    })),
    totalCurrentBalance: 0,
    monthlyCells: years.flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        year,
        ownerAmount: 0,
        commerceAmount: 0,
      }))
    ),
  };
}

function buildTotals(rows: FeeReportRow[], years: number[]): FeeReportTotals {
  const totals = buildEmptyTotals(years);
  for (const row of rows) {
    totals.pastDueOwner         += row.pastDueOwner;
    totals.pastDueCommerce      += row.pastDueCommerce;
    totals.prepaidPrevYearOwner  += row.prepaidPrevYearOwner;
    totals.prepaidPrevYearCommerce += row.prepaidPrevYearCommerce;
    totals.totalCurrentBalance  += row.totalCurrentBalance;
    for (const yc of row.yearCharges) {
      const t = totals.yearCharges.find((t) => t.year === yc.year);
      if (t) {
        t.ownerAnnualAmount    += yc.ownerAnnualAmount;
        t.ownerMonthlyAmount   += yc.ownerMonthlyAmount;
        t.commerceAnnualAmount += yc.commerceAnnualAmount;
        t.commerceMonthlyAmount += yc.commerceMonthlyAmount;
        t.ownerBalance         += yc.ownerBalance;
        t.commerceBalance      += yc.commerceBalance;
      }
    }
    for (const mc of row.monthlyPayments) {
      const t = totals.monthlyCells.find((t) => t.year === mc.year && t.month === mc.month);
      if (t) { t.ownerAmount += mc.ownerAmount; t.commerceAmount += mc.commerceAmount; }
    }
  }
  return totals;
}
