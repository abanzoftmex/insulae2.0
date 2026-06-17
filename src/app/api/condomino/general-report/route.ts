/**
 * GET /api/condomino/general-report
 * Reporte general: todas las áreas + arrendamientos con saldos y estadísticas.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";
import { computeBalance, num, round2 } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const year = new Date().getFullYear();

  const areas = await prisma.privateArea.findMany({
    where: { condominiumId: session.condominiumId },
    select: {
      id: true, name: true, zone: true, useType: true, status: true, m2Original: true,
      charges: { where: { responsibility: "OWNER" }, select: { amount: true, paidAmount: true, interestAmount: true, discountAmount: true, status: true, dueDate: true } },
    },
    orderBy: { sortOrder: "asc" },
    take: 2000,
  });

  const estadisticasPorZona: Record<string, { total_areas: number; saldo_pendiente: number; saldo_vencido: number }> = {};
  let total_saldo_pendiente = 0;
  let total_saldo_vencido = 0;
  let total_intereses = 0;
  let areas_con_saldo_vencido = 0;

  const out = areas.map((a) => {
    const bal = computeBalance(a.charges);
    const meses: Record<number, number> = {};
    for (const c of a.charges) {
      if (c.status === "CANCELED" || !c.dueDate || c.dueDate.getFullYear() !== year) continue;
      const m = c.dueDate.getMonth() + 1;
      const saldo = num(c.amount) - num(c.paidAmount) - num(c.discountAmount) + num(c.interestAmount);
      meses[m] = round2((meses[m] || 0) + saldo);
    }
    total_saldo_pendiente += bal.saldo_pendiente;
    total_saldo_vencido += bal.saldo_vencido;
    total_intereses += bal.intereses_acumulados;
    if (bal.saldo_vencido > 0) areas_con_saldo_vencido++;
    const zona = a.zone || "Sin zona";
    if (!estadisticasPorZona[zona]) estadisticasPorZona[zona] = { total_areas: 0, saldo_pendiente: 0, saldo_vencido: 0 };
    estadisticasPorZona[zona].total_areas++;
    estadisticasPorZona[zona].saldo_pendiente = round2(estadisticasPorZona[zona].saldo_pendiente + bal.saldo_pendiente);
    estadisticasPorZona[zona].saldo_vencido = round2(estadisticasPorZona[zona].saldo_vencido + bal.saldo_vencido);

    return {
      id: `prop_${a.id}`,
      tipo: "Propiedad",
      identificador: a.name,
      direccion: "",
      zona,
      uso_suelo: a.useType || "Sin uso definido",
      status: a.status || "",
      m2_totales: num(a.m2Original),
      meses,
      saldo_pendiente: bal.saldo_pendiente,
      saldo_vencido: bal.saldo_vencido,
      intereses_acumulados: bal.intereses_acumulados,
      estado_financiero: bal.estado_saldo,
    };
  });

  return NextResponse.json({
    success: true,
    areas: out,
    estadisticas: {
      total_areas: out.length,
      total_propiedades: out.length,
      total_arrendamientos: 0,
      total_saldo_pendiente: round2(total_saldo_pendiente),
      total_saldo_vencido: round2(total_saldo_vencido),
      total_intereses: round2(total_intereses),
      areas_con_saldo_vencido,
      estadisticas_por_zona: estadisticasPorZona,
    },
  });
}
