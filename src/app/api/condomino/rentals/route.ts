/**
 * GET /api/condomino/rentals
 * Arrendamientos (comercios) del condómino autenticado, con saldos.
 * Formato compatible con el contrato legacy del minisitio.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { requireCondomino } from "@/shared/application/auth/condomino-session";
import { computeBalance, num } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

function fullName(u: { firstName: string | null; lastName: string | null; businessName: string | null } | null): string | null {
  if (!u) return null;
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.businessName || null;
}

export async function GET(request: NextRequest) {
  const auth = await requireCondomino(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const rentals = await prisma.rental.findMany({
    where: {
      condominiumId: session.condominiumId,
      OR: [{ administrativeContactUserId: session.userId }, { operativeContactUserId: session.userId }],
    },
    select: {
      id: true,
      status: true,
      startsAt: true,
      notes: true,
      tenantName: true,
      commerce: { select: { name: true } },
      administrativeContactUser: { select: { firstName: true, lastName: true, businessName: true } },
      operativeContactUser: { select: { firstName: true, lastName: true, businessName: true } },
      privateArea: {
        select: { id: true, name: true, code: true, zone: true, useType: true, m2Original: true, m2Construction: true, indiviso: true, parentPrivateAreaId: true },
      },
      charges: {
        where: { responsibility: "COMMERCE" },
        select: { amount: true, paidAmount: true, interestAmount: true, discountAmount: true, status: true, dueDate: true },
      },
    },
    orderBy: { startsAt: "desc" },
  });

  let totalSaldoVencido = 0;
  let totalCargos = 0;
  let arrendamientosConSaldoVencido = 0;

  const arrendamientos = rentals.map((r) => {
    const bal = computeBalance(r.charges);
    if (bal.saldo_vencido > 0) arrendamientosConSaldoVencido++;
    totalSaldoVencido += bal.saldo_vencido;
    totalCargos += bal.cargosTotales;
    const activo = r.status === "ACTIVO" || r.status === "1" || r.status === "ACTIVE";

    return {
      id_arrendamientos: r.id,
      nombre_comercio: r.commerce?.name || r.tenantName || "Comercio",
      razon_social_comercio: r.commerce?.name || null,
      fecha_inicio: r.startsAt,
      id_cat_status_comercios: activo ? 1 : 0,
      observaciones: r.notes || null,
      folio_861: null,
      fecha_inscripcion_f861: null,
      fecha_vigencia_f861: null,
      clase_comercio: "",
      id_areas_privativas: r.privateArea?.id ?? null,
      area_privativa: r.privateArea?.name ?? "",
      direccion_area: "",
      superficie: num(r.privateArea?.m2Original),
      m2_construccion: num(r.privateArea?.m2Construction),
      id_areas_privativas_padre: r.privateArea?.parentPrivateAreaId ?? null,
      barrio: r.privateArea?.zone || "Sin barrio",
      uso_suelo: r.privateArea?.useType || "Sin uso definido",
      contacto_administrativo: fullName(r.administrativeContactUser),
      contacto_contable: fullName(r.operativeContactUser),
      indiviso: num(r.privateArea?.indiviso),
      indiviso_fap_condominio: null,
      saldo_pendiente: bal.saldo_pendiente,
      saldo_vencido: bal.saldo_vencido,
      saldo_pendiente_no_vencido: Math.max(0, bal.saldo_pendiente - bal.saldo_vencido),
      saldo_a_favor: bal.saldo_a_favor,
      intereses_acumulados: bal.intereses_acumulados,
      estado_financiero: bal.estado_saldo,
    };
  });

  return NextResponse.json({
    success: true,
    arrendamientos,
    total: arrendamientos.length,
    saldoVencidoData: {
      totalSaldoVencido: Math.round(totalSaldoVencido * 100) / 100,
      totalCargos: Math.round(totalCargos * 100) / 100,
      arrendamientosConSaldoVencido,
    },
  });
}
