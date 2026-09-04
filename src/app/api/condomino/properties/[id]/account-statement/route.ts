/**
 * GET /api/condomino/properties/[id]/account-statement
 * Estado de cuenta de una propiedad del condómino (cargos, movimientos, pagos).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { requireCondomino } from "@/shared/application/auth/condomino-session";
import { getCondominoScope, computeBalance, num, round2 } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

function mapPagoStatus(status: string): number {
  // legacy id_cat_status_pago: 2 = pagado/cancelado-excluido; 1 = pendiente
  return status === "PAID" ? 2 : 1;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireCondomino(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { id } = await ctx.params;
  const scope = await getCondominoScope(session.userId, session.condominiumId);
  if (!scope.privateAreaIds.includes(id)) {
    return NextResponse.json({ success: false, message: "Propiedad no encontrada." }, { status: 404 });
  }

  const [area, charges, payments, project] = await Promise.all([
    prisma.privateArea.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, zone: true, m2Original: true, m2Construction: true, indiviso: true },
    }),
    prisma.charge.findMany({
      where: { privateAreaId: id, responsibility: "OWNER" },
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
      select: {
        amount: true, paidAmount: true, interestAmount: true, discountAmount: true,
        status: true, dueDate: true, concept: true,
        chargeGroup: { select: { id: true, name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { privateAreaId: id },
      orderBy: { paidAt: "desc" },
      take: 20,
      select: { id: true, paidAt: true, amount: true, method: true, reference: true },
    }),
    prisma.project.findFirst({
      where: { condominiumId: session.condominiumId, isActive: true },
      select: { id: true, name: true, condominiumLogoUrl: true, totalM2: true },
    }),
  ]);

  if (!area) return NextResponse.json({ success: false, message: "Propiedad no encontrada." }, { status: 404 });

  const bal = computeBalance(charges);

  const movimientos = charges.map((c) => ({
    monto: num(c.amount),
    fechaPago: c.dueDate,
    id_cat_grupos_cobro: c.chargeGroup?.id ?? null,
    concepto: c.concept || c.chargeGroup?.name || "Cargo",
    id_cat_status_pago: mapPagoStatus(c.status),
    fechaLiquidacion: null,
    id_cat_sanciones: null,
    intereses: num(c.interestAmount),
    descuento_aplicado: num(c.discountAmount),
    montoAbonado: num(c.paidAmount),
    fechaVigencia: c.dueDate,
    grupoCobro: c.chargeGroup?.name || "General",
    sancionInfo: null,
  }));

  const historialPagos = payments.map((p) => ({
    fechaPago: p.paidAt,
    monto: num(p.amount),
    id_cat_status_historico_pagos: 1,
    id_cat_formas_pago: null,
    id_historico_pagos: p.id,
    folio: p.reference || "",
    formaPago: p.method || "",
  }));

  return NextResponse.json({
    success: true,
    propiedad: {
      id_areas_privativas: area.id,
      nombre: area.name,
      iniciales: area.code || area.name,
      direccion: "",
      m2_totales: num(area.m2Original),
      m2_construccion: num(area.m2Construction),
      indiviso: num(area.indiviso),
      zona: area.zone || "Sin barrio",
    },
    estadoCuenta: {
      cargosTotales: bal.cargosTotales,
      pagosRealizados: bal.pagosRealizados,
      intereses: bal.intereses_acumulados,
      descuentos: bal.descuentos,
      saldoPendiente: bal.saldo_pendiente,
      saldoAFavor: bal.saldo_a_favor,
      movimientos,
      historialPagos,
    },
    proyecto: {
      id_proyectos: project?.id ?? null,
      nombre: project?.name ?? PROJECT_SCOPE.condominiumName,
      logo: project?.condominiumLogoUrl ?? null,
      totalM2: round2(num(project?.totalM2)),
    },
  });
}
