/**
 * Reportes financieros del condominio para el portal: estado de resultados y resumen
 * financiero. Agrega ingresos (Income) y egresos (Expense) por grupo, mes y año, y los
 * transforma a los shapes que esperan las pantallas (antes `lib/financialMappers.js` del
 * minisitio sobre GET /api/condomino/financials).
 */
import { cache } from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { num, round2 } from "../scope";

type MonthMap = Record<number, number>;

export interface FinancialGroup {
  id: string;
  nombre: string;
  /** mesesPorAnio["2026"][mes 1-12] = importe */
  mesesPorAnio: Record<string, MonthMap>;
  totalAnual: number;
}

export interface Financials {
  success: true;
  years: number[];
  income: { ordinaryGroups: FinancialGroup[]; extraordinaryGroups: FinancialGroup[]; otherIncome: FinancialGroup[] };
  expense: { groups: FinancialGroup[] };
}

function ensureGroup(map: Map<string, FinancialGroup>, id: string, nombre: string): FinancialGroup {
  let g = map.get(id);
  if (!g) {
    g = { id, nombre, mesesPorAnio: {}, totalAnual: 0 };
    map.set(id, g);
  }
  return g;
}

function addToGroup(g: FinancialGroup, year: number, month: number, amount: number) {
  const y = String(year);
  if (!g.mesesPorAnio[y]) g.mesesPorAnio[y] = {};
  g.mesesPorAnio[y][month] = round2((g.mesesPorAnio[y][month] || 0) + amount);
  g.totalAnual = round2(g.totalAnual + amount);
}

function isExtraordinary(kind: string | null | undefined): boolean {
  return kind === "EXTRA_CONDO" || kind === "EXTRA_COMMERCE";
}

function currentYear(): number {
  return new Date().getFullYear();
}

/** Ingresos y egresos agregados por grupo/mes para los años pedidos. */
export async function getFinancials(session: CondominoTokenPayload, yearsInput: number[]): Promise<Financials> {
  const years = yearsInput.filter((y) => Number.isFinite(y));
  if (years.length === 0) years.push(currentYear());
  return loadFinancials(session.condominiumId, years.join(","));
}

/**
 * Memorizado por petición: una pantalla (p. ej. el estado de resultados) pide totales,
 * ingresos y egresos del mismo año y antes eso eran tres lecturas completas.
 * Los consumidores no mutan el resultado (los mappers construyen objetos nuevos).
 */
const loadFinancials = cache(async (condominiumId: string, yearsKey: string): Promise<Financials> => {
  const years = yearsKey.split(",").map(Number);
  const start = new Date(Math.min(...years), 0, 1);
  const end = new Date(Math.max(...years) + 1, 0, 1);

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: { condominiumId, isActive: true, date: { gte: start, lt: end } },
      select: {
        date: true,
        amount: true,
        chargeGroup: { select: { id: true, name: true, kind: true } },
        miscCatalog: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { condominiumId, isActive: true, date: { gte: start, lt: end } },
      select: {
        date: true,
        amount: true,
        budgetConcept: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const incOrd = new Map<string, FinancialGroup>();
  const incExt = new Map<string, FinancialGroup>();
  const incOther = new Map<string, FinancialGroup>();
  for (const i of incomes) {
    const year = i.date.getFullYear();
    const month = i.date.getMonth() + 1;
    const amount = num(i.amount);
    if (i.miscCatalog) {
      addToGroup(ensureGroup(incOther, i.miscCatalog.id, i.miscCatalog.name), year, month, amount);
    } else if (i.chargeGroup) {
      const target = isExtraordinary(i.chargeGroup.kind) ? incExt : incOrd;
      addToGroup(ensureGroup(target, i.chargeGroup.id, i.chargeGroup.name), year, month, amount);
    } else {
      addToGroup(ensureGroup(incOrd, "sin-grupo", "Sin grupo"), year, month, amount);
    }
  }

  const expGroups = new Map<string, FinancialGroup>();
  for (const e of expenses) {
    const gid = e.budgetConcept?.group?.id || "sin-grupo";
    const gname = e.budgetConcept?.group?.name || "Sin grupo";
    addToGroup(ensureGroup(expGroups, gid, gname), e.date.getFullYear(), e.date.getMonth() + 1, num(e.amount));
  }

  return {
    success: true,
    years,
    income: {
      ordinaryGroups: [...incOrd.values()],
      extraordinaryGroups: [...incExt.values()],
      otherIncome: [...incOther.values()],
    },
    expense: { groups: [...expGroups.values()] },
  };
});

/**
 * Años que realmente tienen movimientos (ingresos, egresos, cargos o pagos), acotados a un
 * rango sano (descarta fechas basura tipo año 4200) y a los 3 más recientes.
 */
export async function getFinancialYears(session: CondominoTokenPayload) {
  const cid = session.condominiumId;
  // Antes se traían TODAS las filas de las cuatro tablas solo para leer el año; ahora la base
  // devuelve los años distintos. EXTRACT trabaja en UTC, igual que el servidor en producción.
  const [yearRows, movimientoRows, anyIncome, anyExpense, anyCharge, anyPayment] = await Promise.all([
    prisma.$queryRaw<{ y: number }[]>`
      SELECT DISTINCT y FROM (
        SELECT EXTRACT(YEAR FROM "date")::int AS y FROM "Income" WHERE "condominiumId" = ${cid} AND "isActive" = true
        UNION SELECT EXTRACT(YEAR FROM "date")::int FROM "Expense" WHERE "condominiumId" = ${cid} AND "isActive" = true
        UNION SELECT "periodYear" FROM "Charge" WHERE "condominiumId" = ${cid} AND "periodYear" <> 0
        UNION SELECT EXTRACT(YEAR FROM "dueDate")::int FROM "Charge" WHERE "condominiumId" = ${cid} AND "dueDate" IS NOT NULL
        UNION SELECT EXTRACT(YEAR FROM "paidAt")::int FROM "Payment" WHERE "condominiumId" = ${cid}
      ) AS t`,
    // Último año con ingresos o egresos registrados: el que tiene sentido abrir por defecto en los
    // reportes de resultados (los cargos se generan por adelantado y dejaban el año actual en ceros).
    prisma.$queryRaw<{ y: number | null }[]>`
      SELECT max(y)::int AS y FROM (
        SELECT EXTRACT(YEAR FROM "date")::int AS y FROM "Income" WHERE "condominiumId" = ${cid} AND "isActive" = true
        UNION SELECT EXTRACT(YEAR FROM "date")::int FROM "Expense" WHERE "condominiumId" = ${cid} AND "isActive" = true
      ) AS t WHERE y BETWEEN 2015 AND ${currentYear() + 1}`,
    prisma.income.findFirst({ where: { condominiumId: cid, isActive: true }, select: { id: true } }),
    prisma.expense.findFirst({ where: { condominiumId: cid, isActive: true }, select: { id: true } }),
    prisma.charge.findFirst({ where: { condominiumId: cid }, select: { id: true } }),
    prisma.payment.findFirst({ where: { condominiumId: cid }, select: { id: true } }),
  ]);

  const thisYear = currentYear();
  const MAX_YEARS = 3;
  const sane = yearRows
    .map((r) => Number(r.y))
    .filter((y) => Number.isFinite(y) && y >= 2015 && y <= thisYear + 1)
    .sort((a, b) => a - b);
  const sorted = (sane.length ? sane : [thisYear]).slice(-MAX_YEARS);

  return {
    success: true as const,
    anios: sorted,
    // El año por defecto = el más reciente con ingresos o egresos (si está entre los visibles);
    // si no hay, el más reciente con cualquier dato.
    latest: sorted.includes(Number(movimientoRows[0]?.y)) ? Number(movimientoRows[0]?.y) : sorted[sorted.length - 1],
    currentYear: thisYear,
    hasData: Boolean(anyIncome || anyExpense || anyCharge || anyPayment),
  };
}

export type FinancialYears = Awaited<ReturnType<typeof getFinancialYears>>;

// ---- Mappers a los shapes de las pantallas ----

export function monthsObj(group: FinancialGroup, anio: number): MonthMap {
  const src = (group.mesesPorAnio && group.mesesPorAnio[String(anio)]) || {};
  const out: MonthMap = {};
  for (let m = 1; m <= 12; m++) out[m] = src[m] || 0;
  return out;
}

export function annualForYear(group: FinancialGroup, anio: number): number {
  return Object.values(monthsObj(group, anio)).reduce((a, b) => a + b, 0);
}

function sumByMonth(groups: FinancialGroup[], anio: number): MonthMap {
  const totals: MonthMap = {};
  for (let m = 1; m <= 12; m++) totals[m] = 0;
  for (const g of groups) {
    const mm = monthsObj(g, anio);
    for (let m = 1; m <= 12; m++) totals[m] += mm[m];
  }
  return totals;
}

function totalOf(byMonth: MonthMap): number {
  return Object.values(byMonth).reduce((a, b) => a + b, 0);
}

export function mapIngresos(fin: Financials, anio: number) {
  const principalesGroups = [...fin.income.ordinaryGroups, ...fin.income.extraordinaryGroups];
  const other = fin.income.otherIncome;

  const totalesPrincipalesPorMes = sumByMonth(principalesGroups, anio);
  const totalesOtrosPorMes = sumByMonth(other, anio);
  const totalPrincipalesAnual = totalOf(totalesPrincipalesPorMes);
  const totalOtrosAnual = totalOf(totalesOtrosPorMes);

  return {
    principales: principalesGroups.map((g) => ({ id: g.id, nombre: g.nombre, meses: monthsObj(g, anio), totalAnual: annualForYear(g, anio) })),
    otros: other.map((g) => ({ id: g.id, nombre: g.nombre, meses: monthsObj(g, anio), totalAnual: annualForYear(g, anio) })),
    totalesPrincipalesPorMes,
    totalesOtrosPorMes,
    totalPrincipalesAnual,
    totalOtrosAnual,
    totalAnual: totalPrincipalesAnual + totalOtrosAnual,
  };
}

export type Ingresos = ReturnType<typeof mapIngresos>;

export function mapEgresosGrupos(fin: Financials, anio: number) {
  const groups = fin.expense.groups;
  const totalesPorMes = sumByMonth(groups, anio);
  return {
    grupos: groups.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      meses: monthsObj(g, anio),
      totalAnual: annualForYear(g, anio),
      opciones: [] as unknown[],
    })),
    totalesPorMes,
    totalAnual: totalOf(totalesPorMes),
  };
}

export type EgresosGrupos = ReturnType<typeof mapEgresosGrupos>;

/** Formato que usa resumen-financiero: meses = [{mes, total}], + totalAnual. */
export function groupToMensual(group: FinancialGroup, anio: number) {
  const mm = monthsObj(group, anio);
  const meses: { mes: number; total: number }[] = [];
  for (let m = 1; m <= 12; m++) meses.push({ mes: m, total: mm[m] || 0 });
  return { id: group.id, nombre: group.nombre, totalAnual: annualForYear(group, anio), meses, categorias: [] as unknown[] };
}

export type GrupoMensual = ReturnType<typeof groupToMensual>;

// ---- Estado de resultados ----

export async function getEstadoResultadoTotales(session: CondominoTokenPayload, anio: number) {
  const fin = await getFinancials(session, [anio]);
  const ingresos = mapIngresos(fin, anio);
  const egresos = mapEgresosGrupos(fin, anio);
  return {
    success: true as const,
    anio,
    totalIngresos: ingresos.totalAnual,
    totalEgresos: egresos.totalAnual,
    balance: ingresos.totalAnual - egresos.totalAnual,
    ingresosPorMes: { principales: ingresos.totalesPrincipalesPorMes, otros: ingresos.totalesOtrosPorMes },
    egresosPorMes: egresos.totalesPorMes,
  };
}

export async function getEstadoResultadoIngresos(session: CondominoTokenPayload, anio: number) {
  const fin = await getFinancials(session, [anio]);
  return { success: true as const, anio, ingresos: mapIngresos(fin, anio) };
}

export async function getEstadoResultadoEgresosGrupos(session: CondominoTokenPayload, anio: number) {
  const fin = await getFinancials(session, [anio]);
  return { success: true as const, anio, egresos: mapEgresosGrupos(fin, anio) };
}

/** Opciones (conceptos presupuestales) por grupo de egreso: sin equivalente en insulae2.0 (vacío válido). */
export function getEstadoResultadoEgresosOpciones() {
  return { success: true as const, opciones: [] as unknown[] };
}

/** Conceptos por opción de egreso: sin equivalente en insulae2.0 (vacío válido). */
export function getEstadoResultadoEgresosConceptos(opcionIdInput: string | null, anio: number) {
  const opcionId = opcionIdInput || null;
  return {
    success: true as const,
    opcionId,
    anio,
    opcion: opcionId ? { id_cat_grupos_presupuesto: opcionId, nombre: "", id_cat_grupos_cobro: null } : null,
    conceptos: [] as unknown[],
    totalConceptos: 0,
    totalGeneral: 0,
  };
}

/** Conceptos de egreso de un grupo presupuestal, por mes (drill-down del estado de resultados). */
export async function getExpenseConcepts(session: CondominoTokenPayload, groupId: string, anio: number) {
  const start = new Date(anio, 0, 1);
  const end = new Date(anio + 1, 0, 1);

  const expenses = await prisma.expense.findMany({
    where: {
      condominiumId: session.condominiumId,
      isActive: true,
      date: { gte: start, lt: end },
      ...(groupId ? { budgetConcept: { group: { id: groupId } } } : {}),
    },
    select: {
      date: true,
      amount: true,
      budgetConcept: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
    },
  });

  const byConcept = new Map<string, { id: string; nombre: string; categoria: string; meses: MonthMap; totalAnual: number }>();
  for (const e of expenses) {
    const cid = e.budgetConcept?.id || "sin-concepto";
    if (!byConcept.has(cid)) {
      const meses: MonthMap = {};
      for (let m = 1; m <= 12; m++) meses[m] = 0;
      byConcept.set(cid, {
        id: cid,
        nombre: e.budgetConcept?.name || "Sin concepto",
        categoria: e.budgetConcept?.group?.name || "General",
        meses,
        totalAnual: 0,
      });
    }
    const c = byConcept.get(cid)!;
    const month = e.date.getMonth() + 1;
    const amount = num(e.amount);
    c.meses[month] = round2(c.meses[month] + amount);
    c.totalAnual = round2(c.totalAnual + amount);
  }

  const conceptos = [...byConcept.values()];
  const opcion = conceptos.length
    ? { id_cat_grupos_presupuesto: groupId, nombre: conceptos[0].categoria, id_cat_grupos_cobro: null }
    : groupId
      ? { id_cat_grupos_presupuesto: groupId, nombre: "", id_cat_grupos_cobro: null }
      : null;

  return {
    success: true as const,
    opcionId: groupId || null,
    anio,
    opcion,
    conceptos,
    totalConceptos: conceptos.length,
    totalGeneral: round2(conceptos.reduce((a, c) => a + c.totalAnual, 0)),
  };
}

export type ExpenseConcepts = Awaited<ReturnType<typeof getExpenseConcepts>>;

// ---- Resumen financiero ----

export async function getBalanceOrdinarias(session: CondominoTokenPayload, anio: number) {
  const fin = await getFinancials(session, [anio]);
  return {
    success: true as const,
    anio,
    ingresosMensuales: fin.income.ordinaryGroups.map((g) => groupToMensual(g, anio)),
    otrosIngresos: fin.income.otherIncome.map((g) => groupToMensual(g, anio)),
    egresosMensuales: fin.expense.groups.map((g) => groupToMensual(g, anio)),
  };
}

export async function getBalanceExtraordinarias(session: CondominoTokenPayload, anio: number) {
  const fin = await getFinancials(session, [anio]);
  return {
    success: true as const,
    anio,
    ingresosMensuales: fin.income.extraordinaryGroups.map((g) => groupToMensual(g, anio)),
    otrosIngresos: [] as GrupoMensual[],
    egresosMensuales: [] as GrupoMensual[],
  };
}

function emptyMonths(): MonthMap {
  const meses: MonthMap = {};
  for (let m = 1; m <= 12; m++) meses[m] = 0;
  return meses;
}

/**
 * Cuentas por cobrar ordinarias (cartera). Estructura válida con importes en cero: el
 * minisitio independiente tampoco la calculaba (sin equivalente en insulae2.0 todavía).
 */
export function getCuentasOrdinarias(anio: number, fondoReserva = 0) {
  return {
    success: true as const,
    anio,
    ordinarias: {
      cuotasOrdinarias: { id: null, nombre: "Cuotas", totalGeneral: 0, totalAnualMeses: 0, meses: emptyMonths() },
      fondoReserva,
      otrosGrupos: [] as unknown[],
      totalAnual: 0,
      totalAnualMeses: 0,
      carteraVencida: 0,
    },
    extraordinarias: { grupos: [] as unknown[], totalAnual: 0 },
  };
}

/** Cuentas por cobrar extraordinarias. Estructura válida (vacía), igual que en el minisitio. */
export function getCuentasExtraordinarias(anio: number) {
  return { success: true as const, anio, extraordinarias: { grupos: [] as unknown[], totalAnual: 0 } };
}

/** Las cuatro consultas del resumen financiero en una sola ida al servidor. */
export async function getResumenFinanciero(session: CondominoTokenPayload, anio: number, fondoReserva = 0) {
  const fin = await getFinancials(session, [anio]);
  return {
    balanceOrdinarias: {
      success: true as const,
      anio,
      ingresosMensuales: fin.income.ordinaryGroups.map((g) => groupToMensual(g, anio)),
      otrosIngresos: fin.income.otherIncome.map((g) => groupToMensual(g, anio)),
      egresosMensuales: fin.expense.groups.map((g) => groupToMensual(g, anio)),
    },
    cuentasOrdinarias: getCuentasOrdinarias(anio, fondoReserva),
    balanceExtraordinarias: {
      success: true as const,
      anio,
      ingresosMensuales: fin.income.extraordinaryGroups.map((g) => groupToMensual(g, anio)),
      otrosIngresos: [] as GrupoMensual[],
      egresosMensuales: [] as GrupoMensual[],
    },
    cuentasExtraordinarias: getCuentasExtraordinarias(anio),
  };
}

export type ResumenFinanciero = Awaited<ReturnType<typeof getResumenFinanciero>>;
