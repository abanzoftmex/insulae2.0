/**
 * GET /api/condomino/properties
 * Propiedades (áreas privativas) del condómino autenticado, con saldos.
 * Formato compatible con el contrato legacy del minisitio.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getCondominoFromRequest } from "@/shared/application/auth/condomino-token";
import { PROJECT_SCOPE } from "@/config/project-scope";
import { getCondominoScope, computeBalance, mapAreaStatus, computeIndiviso, num } from "@/shared/application/condomino/condomino-scope";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getCondominoFromRequest(request);
  if (!session) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 401 });

  const scope = await getCondominoScope(session.userId, session.condominiumId);
  if (scope.privateAreaIds.length === 0) {
    return NextResponse.json({ success: true, propiedades: [], ultimaActualizacionTexto: "Sin propiedades asignadas" });
  }

  const project = await prisma.project.findFirst({
    where: { condominiumId: session.condominiumId, isActive: true },
    select: { totalM2: true },
  });
  const totalM2Proyecto = project?.totalM2 ?? null;

  const areas = await prisma.privateArea.findMany({
    where: { id: { in: scope.privateAreaIds } },
    select: {
      id: true,
      code: true,
      name: true,
      zone: true,
      useType: true,
      m2Original: true,
      m2Construction: true,
      m2CommonArea: true,
      indiviso: true,
      vccc: true,
      status: true,
      sortOrder: true,
      parentPrivateAreaId: true,
      isFusion: true,
      charges: {
        where: { responsibility: "OWNER" },
        select: { amount: true, paidAmount: true, interestAmount: true, discountAmount: true, status: true, dueDate: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const propiedades = areas.map((a) => {
    const bal = computeBalance(a.charges);
    const st = mapAreaStatus(a.status);
    return {
      id_areas_privativas: a.id,
      id_dcat_zonas: null,
      id_cat_status: st.id_cat_status,
      nombre: a.name,
      iniciales: a.code || a.name,
      m2_totales: num(a.m2Original),
      direccion: "",
      m2_construccion: num(a.m2Construction),
      vcc: num(a.vccc),
      m2_area_comun: num(a.m2CommonArea),
      m2Original: num(a.m2Original),
      id_areas_privativas_padre: a.parentPrivateAreaId,
      id_areas_privativas_hijo: null,
      es_fusion: !!a.isFusion,
      ordenamiento: a.sortOrder ?? 0,
      status_nombre: st.status_nombre,
      zona: a.zone || "Sin barrio",
      uso_suelo: a.useType || "Sin uso definido",
      indiviso: computeIndiviso(a.m2Original, totalM2Proyecto, a.indiviso),
      indiviso_fap_condominio: null,
      parent_ordenamiento: null,
      saldo_pendiente: bal.saldo_pendiente,
      saldo_vencido: bal.saldo_vencido,
      saldo_a_favor: bal.saldo_a_favor,
      intereses_acumulados: bal.intereses_acumulados,
      estado_saldo: bal.estado_saldo,
    };
  });

  return NextResponse.json({
    success: true,
    propiedades,
    ultimaActualizacionTexto: "Actualizado al día de hoy",
  });
}
