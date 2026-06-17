/**
 * GET /api/condomino/financials?years=2025,2026
 * Agrega ingresos (Income) y egresos (Expense) por grupo, mes y año.
 * Alimenta estado-resultado y resumen-financiero del minisitio.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";
import { num, round2 } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

interface GroupAcc {
  id: string;
  nombre: string;
  mesesPorAnio: Record<string, Record<number, number>>;
  totalAnual: number;
}

function ensureGroup(map: Map<string, GroupAcc>, id: string, nombre: string): GroupAcc {
  let g = map.get(id);
  if (!g) {
    g = { id, nombre, mesesPorAnio: {}, totalAnual: 0 };
    map.set(id, g);
  }
  return g;
}

function addToGroup(g: GroupAcc, year: number, month: number, amount: number) {
  const y = String(year);
  if (!g.mesesPorAnio[y]) g.mesesPorAnio[y] = {};
  g.mesesPorAnio[y][month] = round2((g.mesesPorAnio[y][month] || 0) + amount);
  g.totalAnual = round2(g.totalAnual + amount);
}

function isExtraordinary(kind: string | null | undefined): boolean {
  return kind === "EXTRA_CONDO" || kind === "EXTRA_COMMERCE";
}

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const yearsParam = new URL(request.url).searchParams.get("years");
  const years = (yearsParam ? yearsParam.split(",") : [String(new Date().getFullYear())])
    .map((y) => parseInt(y.trim(), 10))
    .filter((y) => Number.isFinite(y));
  if (years.length === 0) years.push(new Date().getFullYear());
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  const start = new Date(minY, 0, 1);
  const end = new Date(maxY + 1, 0, 1);

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: { condominiumId: session.condominiumId, isActive: true, date: { gte: start, lt: end } },
      select: { date: true, amount: true, chargeGroup: { select: { id: true, name: true, kind: true } }, miscCatalog: { select: { id: true, name: true } } },
    }),
    prisma.expense.findMany({
      where: { condominiumId: session.condominiumId, isActive: true, date: { gte: start, lt: end } },
      select: { date: true, amount: true, budgetConcept: { select: { id: true, name: true, group: { select: { id: true, name: true } } } } },
    }),
  ]);

  const incOrd = new Map<string, GroupAcc>();
  const incExt = new Map<string, GroupAcc>();
  const incOther = new Map<string, GroupAcc>();
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

  const expGroups = new Map<string, GroupAcc>();
  for (const e of expenses) {
    const year = e.date.getFullYear();
    const month = e.date.getMonth() + 1;
    const amount = num(e.amount);
    const gid = e.budgetConcept?.group?.id || "sin-grupo";
    const gname = e.budgetConcept?.group?.name || "Sin grupo";
    addToGroup(ensureGroup(expGroups, gid, gname), year, month, amount);
  }

  const toArr = (m: Map<string, GroupAcc>) => [...m.values()];

  return NextResponse.json({
    success: true,
    years,
    income: { ordinaryGroups: toArr(incOrd), extraordinaryGroups: toArr(incExt), otherIncome: toArr(incOther) },
    expense: { groups: toArr(expGroups) },
  });
}
