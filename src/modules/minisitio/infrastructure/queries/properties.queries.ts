/** Propiedades (áreas privativas) del condómino, con saldos. Contrato legacy del minisitio. */
import { cache } from "react";
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { getActiveProject } from "../condominium";
import { computeBalance, computeIndiviso, getCondominoScope, mapAreaStatus, num } from "../scope";

const OWNER_CHARGES_SELECT = {
  where: { responsibility: "OWNER" as const },
  select: { amount: true, paidAmount: true, interestAmount: true, discountAmount: true, status: true, dueDate: true },
};

const AREA_SELECT = {
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
  charges: OWNER_CHARGES_SELECT,
} as const;

type AreaRow = {
  id: string;
  code: string | null;
  name: string;
  zone: string | null;
  useType: string | null;
  m2Original: unknown;
  m2Construction: unknown;
  m2CommonArea: unknown;
  indiviso: unknown;
  vccc: unknown;
  status: string | null;
  sortOrder: number | null;
  parentPrivateAreaId: string | null;
  isFusion: boolean | null;
  charges: Parameters<typeof computeBalance>[0];
};

function toPropiedad(a: AreaRow, totalM2Proyecto: unknown) {
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
}

export type Propiedad = ReturnType<typeof toPropiedad>;

async function listPropertiesUncached(session: CondominoTokenPayload) {
  const scope = await getCondominoScope(session.userId, session.condominiumId);
  if (scope.privateAreaIds.length === 0) {
    return { success: true as const, propiedades: [] as Propiedad[], ultimaActualizacionTexto: "Sin propiedades asignadas" };
  }

  const project = await getActiveProject(session.condominiumId);
  const areas = await prisma.privateArea.findMany({
    where: { id: { in: scope.privateAreaIds } },
    select: AREA_SELECT,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    success: true as const,
    propiedades: areas.map((a) => toPropiedad(a, project?.totalM2 ?? null)),
    ultimaActualizacionTexto: "Actualizado al día de hoy",
  };
}

export type PropertiesList = Awaited<ReturnType<typeof listProperties>>;

/** Detalle de una propiedad del condómino: datos + balance + imágenes. `null` si no es suya. */
export async function getPropertyDetail(session: CondominoTokenPayload, id: string) {
  const scope = await getCondominoScope(session.userId, session.condominiumId);
  if (!scope.privateAreaIds.includes(id)) return null;

  const area = await prisma.privateArea.findUnique({
    where: { id },
    select: {
      ...AREA_SELECT,
      images: { orderBy: { slotIndex: "asc" }, select: { id: true, url: true, fileName: true } },
    },
  });
  if (!area) return null;

  const project = await getActiveProject(session.condominiumId);
  const bal = computeBalance(area.charges);
  // El detalle de la API vieja no traía `parent_ordenamiento` (el listado sí).
  const propiedad: Omit<Propiedad, "parent_ordenamiento"> & { parent_ordenamiento?: null } = toPropiedad(
    area,
    project?.totalM2 ?? null,
  );
  delete propiedad.parent_ordenamiento;

  return {
    success: true as const,
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
    images: area.images.map((img) => ({
      id: img.id,
      descripcion: img.fileName || "",
      imagen: img.url,
      full_url: img.url,
      thumbnail_url: img.url,
    })),
  };
}

export type PropertyDetail = NonNullable<Awaited<ReturnType<typeof getPropertyDetail>>>;

/** Memorizada por petición: el layout del portal (barra lateral) y la página la comparten. */
export const listProperties = cache(listPropertiesUncached);
