/**
 * GET /api/condomino/rentals/[id]/account-statement
 * Estado de cuenta de un arrendamiento del condómino.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";
import { computeBalance, num } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;

  const rental = await prisma.rental.findFirst({
    where: {
      id,
      condominiumId: session.condominiumId,
      OR: [{ administrativeContactUserId: session.userId }, { operativeContactUserId: session.userId }],
    },
    select: {
      id: true,
      tenantName: true,
      commerce: { select: { name: true } },
      privateArea: { select: { name: true } },
      administrativeContactUser: { select: { firstName: true, lastName: true, email: true, personalEmail: true, businessEmail: true, phone: true, rfc: true, businessName: true } },
      charges: {
        where: { responsibility: "COMMERCE" },
        orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
        select: {
          amount: true, paidAmount: true, interestAmount: true, discountAmount: true,
          status: true, dueDate: true, concept: true,
          chargeGroup: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!rental) return NextResponse.json({ success: false, message: "Arrendamiento no encontrado." }, { status: 404 });

  const bal = computeBalance(rental.charges);
  const contact = rental.administrativeContactUser;
  const contactName = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.businessName || "" : "";
  const contactEmail = contact?.email || contact?.personalEmail || contact?.businessEmail || "";

  const debeAlDia: Record<string, number> = {};
  const cargosTotalesGrupo: Record<string, number> = {};
  const movimientos = rental.charges.map((c) => {
    const gid = c.chargeGroup?.id || "general";
    const monto = num(c.amount);
    const abonado = num(c.paidAmount);
    const saldo = monto - abonado - num(c.discountAmount) + num(c.interestAmount);
    cargosTotalesGrupo[gid] = (cargosTotalesGrupo[gid] || 0) + monto;
    if (c.status !== "PAID" && c.status !== "CANCELED") debeAlDia[gid] = (debeAlDia[gid] || 0) + (monto - num(c.discountAmount));
    return {
      fechaPago: c.dueDate,
      fechaVigencia: c.dueDate,
      fechaLiquidacion: null,
      concepto: c.concept || c.chargeGroup?.name || "Cargo",
      monto,
      montoAbonado: abonado,
      estado: c.status === "PAID" ? "pagado" : "pendiente",
      intereses: num(c.interestAmount),
      descuento_aplicado: num(c.discountAmount),
      id_cat_grupos_cobro: c.chargeGroup?.id ?? null,
      grupoCobro: c.chargeGroup?.name || "General",
      id_cat_status_pago: c.status === "PAID" ? 2 : 1,
      saldoPendiente: saldo,
    };
  });

  const pagos = movimientos.map((m) => ({
    fecha: m.fechaPago,
    concepto: m.concepto,
    monto: m.monto,
    status: m.estado,
    formaPago: null,
    folio: null,
    comprobante: null,
    montoAbonado: m.montoAbonado,
    saldoPendiente: m.saldoPendiente,
    fechaVigencia: m.fechaVigencia,
    intereses: m.intereses,
    descuento_aplicado: m.descuento_aplicado,
  }));

  return NextResponse.json({
    success: true,
    arrendamiento: {
      id_arrendamientos: rental.id,
      nombre_comercio: rental.commerce?.name || rental.tenantName || "Comercio",
      razon_social_comercio: rental.commerce?.name || null,
      email: contactEmail,
      telefono: contact?.phone || "",
      rfc: contact?.rfc || null,
      area_nombre: rental.privateArea?.name || null,
      directorio_comercio_nombre: contactName,
      directorio_comercio_razon_social: rental.commerce?.name || "",
      directorio_comercio_email: contactEmail,
      directorio_comercio_telefono: contact?.phone || "",
    },
    estadoCuenta: {
      cargosTotales: bal.cargosTotales,
      pagosRealizados: bal.pagosRealizados,
      intereses: bal.intereses_acumulados,
      saldoPendiente: bal.saldo_pendiente,
      saldoVencido: bal.saldo_vencido,
      gruposCalculos: { debeAlDia, cargosTotales: cargosTotalesGrupo },
      pagos,
      movimientos,
    },
  });
}
