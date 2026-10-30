/** Estados de cuenta del condómino: por propiedad (cargos OWNER) y por arrendamiento (COMMERCE). */
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { getActiveProject, toIso } from "../condominium";
import { computeBalance, getCondominoScope, num, round2 } from "../scope";

function mapPagoStatus(status: string): number {
  // legacy id_cat_status_pago: 2 = pagado; 1 = pendiente. Los cancelados no llegan aquí: se excluyen
  // en la consulta, como en la 1.0 (antes se listaban como pendientes aunque el saldo no los cuenta).
  return status === "PAID" ? 2 : 1;
}

/** `null` si la propiedad no pertenece al condómino. */
export async function getPropertyAccountStatement(session: CondominoTokenPayload, id: string) {
  const scope = await getCondominoScope(session.userId, session.condominiumId);
  if (!scope.privateAreaIds.includes(id)) return null;

  const [area, charges, payments, project] = await Promise.all([
    prisma.privateArea.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, zone: true, m2Original: true, m2Construction: true, indiviso: true },
    }),
    prisma.charge.findMany({
      where: { privateAreaId: id, responsibility: "OWNER", status: { not: "CANCELED" } },
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
      select: {
        amount: true,
        paidAmount: true,
        interestAmount: true,
        discountAmount: true,
        status: true,
        dueDate: true,
        concept: true,
        chargeGroup: { select: { id: true, name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { privateAreaId: id },
      orderBy: { paidAt: "desc" },
      take: 20,
      select: { id: true, paidAt: true, amount: true, method: true, reference: true },
    }),
    getActiveProject(session.condominiumId),
  ]);
  if (!area) return null;

  const bal = computeBalance(charges);

  const movimientos = charges.map((c) => ({
    monto: num(c.amount),
    fechaPago: toIso(c.dueDate),
    id_cat_grupos_cobro: c.chargeGroup?.id ?? null,
    concepto: c.concept || c.chargeGroup?.name || "Cargo",
    id_cat_status_pago: mapPagoStatus(c.status),
    fechaLiquidacion: null,
    id_cat_sanciones: null,
    intereses: num(c.interestAmount),
    descuento_aplicado: num(c.discountAmount),
    montoAbonado: num(c.paidAmount),
    fechaVigencia: toIso(c.dueDate),
    grupoCobro: c.chargeGroup?.name || "General",
    sancionInfo: null,
  }));

  const historialPagos = payments.map((p) => ({
    fechaPago: toIso(p.paidAt),
    monto: num(p.amount),
    id_cat_status_historico_pagos: 1,
    id_cat_formas_pago: null,
    id_historico_pagos: p.id,
    folio: p.reference || "",
    formaPago: p.method || "",
  }));

  return {
    success: true as const,
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
      saldoVencido: bal.saldo_vencido,
      movimientos,
      historialPagos,
    },
    proyecto: {
      id_proyectos: project?.id ?? null,
      nombre: project?.name ?? PROJECT_SCOPE.condominiumName,
      logo: project?.condominiumLogoUrl ?? null,
      totalM2: round2(num(project?.totalM2)),
    },
  };
}

export type PropertyAccountStatement = NonNullable<Awaited<ReturnType<typeof getPropertyAccountStatement>>>;

/** `null` si el arrendamiento no pertenece al condómino. */
export async function getRentalAccountStatement(session: CondominoTokenPayload, id: string) {
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
      administrativeContactUser: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          personalEmail: true,
          businessEmail: true,
          phone: true,
          rfc: true,
          businessName: true,
        },
      },
      charges: {
        where: { responsibility: "COMMERCE", status: { not: "CANCELED" } },
        orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
        select: {
          amount: true,
          paidAmount: true,
          interestAmount: true,
          discountAmount: true,
          status: true,
          dueDate: true,
          concept: true,
          chargeGroup: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!rental) return null;

  const bal = computeBalance(rental.charges);
  const contact = rental.administrativeContactUser;
  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.businessName || ""
    : "";
  const contactEmail = contact?.email || contact?.personalEmail || contact?.businessEmail || "";

  const debeAlDia: Record<string, number> = {};
  const cargosTotalesGrupo: Record<string, number> = {};
  const movimientos = rental.charges.map((c) => {
    const gid = c.chargeGroup?.id || "general";
    const monto = num(c.amount);
    const abonado = num(c.paidAmount);
    const saldo = monto - abonado - num(c.discountAmount) + num(c.interestAmount);
    cargosTotalesGrupo[gid] = (cargosTotalesGrupo[gid] || 0) + monto;
    if (c.status !== "PAID" && c.status !== "CANCELED") {
      debeAlDia[gid] = (debeAlDia[gid] || 0) + (monto - num(c.discountAmount));
    }
    return {
      fechaPago: toIso(c.dueDate),
      fechaVigencia: toIso(c.dueDate),
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

  return {
    success: true as const,
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
  };
}

export type RentalAccountStatement = NonNullable<Awaited<ReturnType<typeof getRentalAccountStatement>>>;
