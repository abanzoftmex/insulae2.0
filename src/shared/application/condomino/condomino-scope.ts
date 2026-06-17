/**
 * Scope de datos de un condómino: a qué áreas privativas y arrendamientos tiene acceso,
 * y utilidades de cálculo de saldos (réplica de la fórmula legacy del minisitio).
 */
import { prisma } from "@/shared/infrastructure/db/prisma";

export interface CondominoScope {
  userId: string;
  condominiumId: string;
  privateAreaIds: string[];
  rentalIds: string[];
}

export async function getCondominoScope(userId: string, condominiumId: string): Promise<CondominoScope> {
  const [assignments, rentals] = await Promise.all([
    prisma.residentAssignment.findMany({
      where: { userId, condominiumId, isActive: true },
      select: { privateAreaId: true },
    }),
    prisma.rental.findMany({
      where: {
        condominiumId,
        OR: [{ administrativeContactUserId: userId }, { operativeContactUserId: userId }],
      },
      select: { id: true },
    }),
  ]);

  return {
    userId,
    condominiumId,
    privateAreaIds: [...new Set(assignments.map((a) => a.privateAreaId))],
    rentalIds: rentals.map((r) => r.id),
  };
}

export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface ChargeLike {
  amount: unknown;
  paidAmount: unknown;
  interestAmount: unknown;
  discountAmount: unknown;
  status: string;
  dueDate: Date | null;
}

export interface BalanceResult {
  saldo_pendiente: number;
  saldo_vencido: number;
  saldo_a_favor: number;
  intereses_acumulados: number;
  cargosTotales: number;
  pagosRealizados: number;
  descuentos: number;
  estado_saldo: "vencido" | "pendiente" | "a_favor" | "al_corriente";
}

/**
 * Réplica de la fórmula legacy: saldo = monto - abonado - descuento + intereses.
 * Excluye cargos CANCELADOS. "Vencido" = cargos con dueDate pasada y saldo > 0.
 */
export function computeBalance(charges: ChargeLike[], now: Date = new Date()): BalanceResult {
  let saldoPendiente = 0;
  let saldoVencido = 0;
  let intereses = 0;
  let cargosTotales = 0;
  let pagos = 0;
  let descuentos = 0;

  for (const c of charges) {
    if (c.status === "CANCELED") continue;
    const amount = num(c.amount);
    const paid = num(c.paidAmount);
    const interest = num(c.interestAmount);
    const discount = num(c.discountAmount);
    const saldo = amount - paid - discount + interest;

    cargosTotales += amount;
    pagos += paid;
    descuentos += discount;
    intereses += interest;
    saldoPendiente += saldo;

    if (saldo > 0 && c.dueDate && c.dueDate < now) {
      saldoVencido += saldo;
    }
  }

  const saldoAFavor = saldoPendiente < 0 ? Math.abs(saldoPendiente) : 0;
  const pendienteFinal = saldoPendiente > 0 ? saldoPendiente : 0;

  const estado_saldo: BalanceResult["estado_saldo"] =
    saldoVencido > 0 ? "vencido" : pendienteFinal > 0 ? "pendiente" : saldoAFavor > 0 ? "a_favor" : "al_corriente";

  return {
    saldo_pendiente: round2(pendienteFinal),
    saldo_vencido: round2(saldoVencido),
    saldo_a_favor: round2(saldoAFavor),
    intereses_acumulados: round2(intereses),
    cargosTotales: round2(cargosTotales),
    pagosRealizados: round2(pagos),
    descuentos: round2(descuentos),
    estado_saldo,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Mapea el status de PrivateArea (v2) al par legacy {id_cat_status, status_nombre}.
 *  Nota: en Sassi las áreas existentes están como UNASSIGNED (status aún sin definir);
 *  se consideran activas (id_cat_status=1) como hacía el flag legacy `activo=1`. */
export function mapAreaStatus(status: string | null | undefined): { id_cat_status: number; status_nombre: string } {
  switch (status) {
    case "UNDER_CONSTRUCTION":
      return { id_cat_status: 3, status_nombre: "En construcción" };
    case "SOLD":
    case "RENTED":
    case "AVAILABLE":
    case "DELINQUENT":
    case "UNASSIGNED":
    default:
      return { id_cat_status: 1, status_nombre: "Activo" };
  }
}

/** Indiviso (%): usa el valor almacenado si existe; si no, lo calcula como m²/totalM²×100 (como la legacy). */
export function computeIndiviso(m2Original: unknown, totalM2: unknown, stored: unknown): number {
  const s = num(stored);
  if (s > 0) return round2(s);
  const m2 = num(m2Original);
  const total = num(totalM2);
  if (m2 > 0 && total > 0) return Math.round((m2 / total) * 100 * 1e6) / 1e6; // 6 decimales
  return 0;
}
