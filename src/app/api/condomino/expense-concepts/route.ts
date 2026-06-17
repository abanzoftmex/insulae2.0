/**
 * GET /api/condomino/expense-concepts?groupId=<budgetGroupId>&anio=2026
 * Conceptos de egreso de un grupo presupuestal, por mes (drill-down del estado de resultados).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";
import { num, round2 } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const groupId = sp.get("groupId") || sp.get("grupoId") || "";
  const anio = parseInt(sp.get("anio") || String(new Date().getFullYear()), 10);
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

  const byConcept = new Map<string, { id: string; nombre: string; categoria: string; meses: Record<number, number>; totalAnual: number }>();
  for (const e of expenses) {
    const cid = e.budgetConcept?.id || "sin-concepto";
    const cname = e.budgetConcept?.name || "Sin concepto";
    const cat = e.budgetConcept?.group?.name || "General";
    if (!byConcept.has(cid)) {
      const meses: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) meses[m] = 0;
      byConcept.set(cid, { id: cid, nombre: cname, categoria: cat, meses, totalAnual: 0 });
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
    : (groupId ? { id_cat_grupos_presupuesto: groupId, nombre: "", id_cat_grupos_cobro: null } : null);

  return NextResponse.json({
    success: true,
    opcionId: groupId || null,
    anio,
    opcion,
    conceptos,
    totalConceptos: conceptos.length,
    totalGeneral: round2(conceptos.reduce((a, c) => a + c.totalAnual, 0)),
  });
}
