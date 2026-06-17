/**
 * GET /api/condomino/financial-years
 * Años que realmente tienen movimientos (ingresos, egresos o cargos) en el condominio.
 * Sirve para que los reportes se posicionen en años con datos (desarrollo nuevo).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const cid = session.condominiumId;
  const [incomes, expenses, charges, payments] = await Promise.all([
    prisma.income.findMany({ where: { condominiumId: cid, isActive: true }, select: { date: true } }),
    prisma.expense.findMany({ where: { condominiumId: cid, isActive: true }, select: { date: true } }),
    prisma.charge.findMany({ where: { condominiumId: cid }, select: { periodYear: true, dueDate: true } }),
    prisma.payment.findMany({ where: { condominiumId: cid }, select: { paidAt: true } }),
  ]);

  const years = new Set<number>();
  incomes.forEach((i) => i.date && years.add(i.date.getFullYear()));
  expenses.forEach((e) => e.date && years.add(e.date.getFullYear()));
  charges.forEach((c) => {
    if (c.periodYear) years.add(c.periodYear);
    if (c.dueDate) years.add(c.dueDate.getFullYear());
  });
  payments.forEach((p) => p.paidAt && years.add(p.paidAt.getFullYear()));

  const currentYear = new Date().getFullYear();
  const MAX_YEARS = 3; // desarrollo establecido: solo años recientes (evita 10 años de columnas)

  // Filtra a un rango sano (descarta fechas basura tipo año 4200) y cap a los más recientes.
  const sane = [...years].filter((y) => y >= 2015 && y <= currentYear + 1).sort((a, b) => a - b);
  const sorted = (sane.length ? sane : [currentYear]).slice(-MAX_YEARS);
  // El año por defecto = el más reciente con datos (donde "realmente está" lo que hay)
  const latest = sorted[sorted.length - 1];

  return NextResponse.json({
    success: true,
    years: sorted,
    latest,
    currentYear,
    hasData: incomes.length + expenses.length + charges.length + payments.length > 0,
  });
}
