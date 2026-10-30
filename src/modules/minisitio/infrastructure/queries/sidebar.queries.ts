/**
 * Datos de la barra lateral del portal: las unidades del condómino como "canales" (con un punto
 * si tienen saldo vencido), los conteos que piden acción y la fecha del último aviso (para
 * marcar "Avisos" como no leído). Lo llama el layout del portal.
 *
 * El layout no se vuelve a ejecutar en navegaciones internas: tras una acción que cambie un
 * conteo (crear una solicitud), la pantalla debe llamar a router.refresh().
 */
import { prisma } from "@/shared/infrastructure/db/prisma";
import type { CondominoTokenPayload } from "@/shared/application/auth/condomino-token";
import { listProperties } from "./properties.queries";
import { listRentals } from "./rentals.queries";

export interface SidebarUnit {
  id: string;
  nombre: string;
  /** Solo cuando dos unidades se llaman igual: lo que las distingue (el área o la clave). */
  detalle?: string;
  vencido: boolean;
}

export interface SidebarData {
  propiedades: SidebarUnit[];
  totalPropiedades: number;
  propiedadesConAdeudo: number;
  comercios: SidebarUnit[];
  totalComercios: number;
  comerciosConAdeudo: number;
  solicitudesAbiertas: number;
  /** Fecha (ISO) del aviso publicado más reciente, o null si no hay. */
  ultimoAviso: string | null;
}

/** Cuántas unidades se listan por sección; el resto queda en "Ver todas". */
const MAX_UNITS = 5;

function topUnits(units: SidebarUnit[]): SidebarUnit[] {
  // Primero las que tienen adeudo: son las que piden atención.
  return [...units]
    .sort((a, b) => Number(b.vencido) - Number(a.vencido) || a.nombre.localeCompare(b.nombre, "es", { numeric: true }))
    .slice(0, MAX_UNITS);
}

/** Si dos unidades se llaman igual, cada una lleva su detalle (como dos personas homónimas en Slack). */
function withDetails<T>(rows: T[], toUnit: (row: T) => SidebarUnit, detailOf: (row: T) => string | null | undefined): SidebarUnit[] {
  const units = rows.map(toUnit);
  const repeated = new Map<string, number>();
  for (const unit of units) repeated.set(unit.nombre, (repeated.get(unit.nombre) ?? 0) + 1);
  return units.map((unit, index) => {
    if ((repeated.get(unit.nombre) ?? 0) < 2) return unit;
    const detalle = detailOf(rows[index])?.trim();
    return detalle && detalle !== unit.nombre ? { ...unit, detalle } : unit;
  });
}

export async function getSidebarData(session: CondominoTokenPayload): Promise<SidebarData> {
  const [propiedadesRes, comerciosRes, solicitudesAbiertas, ultimoAviso] = await Promise.all([
    listProperties(session).catch(() => null),
    listRentals(session).catch(() => null),
    prisma.ticket
      .count({
        where: { condominiumId: session.condominiumId, openedById: session.userId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      })
      .catch(() => 0),
    prisma.notification
      .findFirst({
        where: { condominiumId: session.condominiumId, sentAt: { lte: new Date() } },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      })
      .then((n) => n?.sentAt?.toISOString() ?? null)
      .catch(() => null),
  ]);

  const propiedades = withDetails(
    propiedadesRes?.propiedades ?? [],
    (p) => ({ id: p.id_areas_privativas, nombre: p.nombre, vencido: p.saldo_vencido > 0 }),
    (p) => (p.iniciales !== p.nombre ? p.iniciales : p.zona),
  );
  const comercios = withDetails(
    comerciosRes?.arrendamientos ?? [],
    (r) => ({ id: r.id_arrendamientos, nombre: r.nombre_comercio, vencido: (r.saldo_vencido ?? 0) > 0 }),
    (r) => r.area_privativa,
  );

  return {
    propiedades: topUnits(propiedades),
    totalPropiedades: propiedades.length,
    propiedadesConAdeudo: propiedades.filter((u) => u.vencido).length,
    comercios: topUnits(comercios),
    totalComercios: comercios.length,
    comerciosConAdeudo: comercios.filter((u) => u.vencido).length,
    solicitudesAbiertas,
    ultimoAviso,
  };
}
