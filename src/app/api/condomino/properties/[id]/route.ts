/**
 * GET /api/condomino/properties/[id]
 * Detalle de una propiedad del condómino: datos + balance + imágenes.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { requireCondomino } from "@/shared/application/auth/condomino-session";
import { getCondominoScope, computeBalance, mapAreaStatus, computeIndiviso, num } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireCondomino(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { id } = await ctx.params;
  const scope = await getCondominoScope(session.userId, session.condominiumId);
  if (!scope.privateAreaIds.includes(id)) {
    return NextResponse.json({ success: false, message: "Propiedad no encontrada." }, { status: 404 });
  }

  const area = await prisma.privateArea.findUnique({
    where: { id },
    select: {
      id: true, code: true, name: true, zone: true, useType: true,
      m2Original: true, m2Construction: true, m2CommonArea: true, indiviso: true, vccc: true,
      status: true, sortOrder: true, parentPrivateAreaId: true, isFusion: true,
      charges: {
        where: { responsibility: "OWNER" },
        select: { amount: true, paidAmount: true, interestAmount: true, discountAmount: true, status: true, dueDate: true },
      },
      images: { orderBy: { slotIndex: "asc" }, select: { id: true, url: true, fileName: true } },
    },
  });
  if (!area) return NextResponse.json({ success: false, message: "Propiedad no encontrada." }, { status: 404 });

  const project = await prisma.project.findFirst({
    where: { condominiumId: session.condominiumId, isActive: true },
    select: { totalM2: true },
  });

  const bal = computeBalance(area.charges);
  const st = mapAreaStatus(area.status);

  const propiedad = {
    id_areas_privativas: area.id,
    id_dcat_zonas: null,
    id_cat_status: st.id_cat_status,
    nombre: area.name,
    iniciales: area.code || area.name,
    m2_totales: num(area.m2Original),
    direccion: "",
    m2_construccion: num(area.m2Construction),
    vcc: num(area.vccc),
    m2_area_comun: num(area.m2CommonArea),
    m2Original: num(area.m2Original),
    id_areas_privativas_padre: area.parentPrivateAreaId,
    id_areas_privativas_hijo: null,
    es_fusion: !!area.isFusion,
    ordenamiento: area.sortOrder ?? 0,
    status_nombre: st.status_nombre,
    zona: area.zone || "Sin barrio",
    uso_suelo: area.useType || "Sin uso definido",
    indiviso: computeIndiviso(area.m2Original, project?.totalM2 ?? null, area.indiviso),
    indiviso_fap_condominio: null,
    saldo_pendiente: bal.saldo_pendiente,
    saldo_vencido: bal.saldo_vencido,
    saldo_a_favor: bal.saldo_a_favor,
    intereses_acumulados: bal.intereses_acumulados,
    estado_saldo: bal.estado_saldo,
  };

  const images = area.images.map((img) => ({
    id: img.id,
    descripcion: img.fileName || "",
    imagen: img.url,
    full_url: img.url,
    thumbnail_url: img.url,
  }));

  return NextResponse.json({
    success: true,
    propiedad,
    balance: {
      saldo_pendiente: bal.saldo_pendiente,
      saldo_vencido: bal.saldo_vencido,
      saldo_a_favor: bal.saldo_a_favor,
      intereses_acumulados: bal.intereses_acumulados,
      cargosTotales: bal.cargosTotales,
      pagosRealizados: bal.pagosRealizados,
      descuentos: bal.descuentos,
    },
    images,
  });
}
