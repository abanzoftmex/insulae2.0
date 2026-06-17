/**
 * GET /api/condomino/dashboard
 * Resumen para el panel del condómino: totales, saldos y últimas notificaciones.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";
import { getCondominoScope, computeBalance, computeIndiviso, num, round2 } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const scope = await getCondominoScope(session.userId, session.condominiumId);

  const project = await prisma.project.findFirst({
    where: { condominiumId: session.condominiumId, isActive: true },
    select: { totalM2: true },
  });
  const totalM2Proyecto = project?.totalM2 ?? null;

  const [areas, rentalCount, notifications] = await Promise.all([
    scope.privateAreaIds.length
      ? prisma.privateArea.findMany({
          where: { id: { in: scope.privateAreaIds } },
          select: {
            m2Original: true,
            indiviso: true,
            charges: {
              where: { responsibility: "OWNER" },
              select: { amount: true, paidAmount: true, interestAmount: true, discountAmount: true, status: true, dueDate: true },
            },
          },
        })
      : Promise.resolve([]),
    prisma.rental.count({
      where: { condominiumId: session.condominiumId, OR: [{ administrativeContactUserId: session.userId }, { operativeContactUserId: session.userId }] },
    }),
    prisma.notification.findMany({
      where: { condominiumId: session.condominiumId },
      orderBy: { sentAt: "desc" },
      take: 5,
      select: { id: true, title: true, message: true, sentAt: true, category: true },
    }),
  ]);

  let saldoPendiente = 0;
  let saldoVencido = 0;
  let saldoAFavor = 0;
  let totalM2 = 0;
  let totalIndiviso = 0;
  let propiedadesConSaldo = 0;
  let propiedadesSinSaldo = 0;

  for (const a of areas) {
    const bal = computeBalance(a.charges);
    saldoPendiente += bal.saldo_pendiente;
    saldoVencido += bal.saldo_vencido;
    saldoAFavor += bal.saldo_a_favor;
    totalM2 += num(a.m2Original);
    totalIndiviso += computeIndiviso(a.m2Original, totalM2Proyecto, a.indiviso);
    if (bal.saldo_pendiente > 0) propiedadesConSaldo++;
    else propiedadesSinSaldo++;
  }

  const notificaciones = notifications.map((n) => ({
    id: n.id,
    titulo: n.title,
    mensaje: n.message,
    fecha: n.sentAt,
    tipo: "info",
    categoria: n.category || "General",
    leida: false,
  }));

  return NextResponse.json({
    notificaciones,
    totalNotificaciones: notificaciones.length,
    totalPropiedades: scope.privateAreaIds.length,
    totalArrendamientos: rentalCount,
    totalM2: round2(totalM2),
    totalIndiviso: round2(totalIndiviso),
    saldoPendiente: round2(saldoPendiente),
    saldoVencido: round2(saldoVencido),
    saldoAFavor: round2(saldoAFavor),
    propiedadesConSaldo,
    propiedadesSinSaldo,
    totalSaldoVencidoPropiedades: round2(saldoVencido),
    propiedades: [],
    arrendamientos: [],
  });
}
