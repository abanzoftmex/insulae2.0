/**
 * Organización jerárquica de las propiedades (antes `utils/propiedadesOrganizer.js`).
 * Orden: Fusiones → AP → FAPs, respetando el campo ordenamiento.
 *
 * La usan la tabla de propiedades y el reporte PDF.
 *
 * Notas del port (con datos de insulae2.0 el legacy perdía filas de la tabla y del PDF):
 * - Comparaba ids numéricos de MySQL (`id > 0`, `a - b`). Los ids ahora son UUID y
 *   `"uuid" > 0` siempre es `false`: desaparecían las FAP cuyo padre no es del condómino.
 *   `tieneReferencia()` conserva la intención ("tiene un id asignado") para ambos tipos.
 * - Las fusiones sin `id_areas_privativas_hijo` (siempre null en insulae2.0) se tratan como AP.
 */

type AreaId = string | number;

export interface PropiedadOrganizable {
  id_areas_privativas: AreaId;
  id_areas_privativas_padre?: AreaId | null;
  id_areas_privativas_hijo?: AreaId | null;
  ordenamiento?: number | null;
  parent_ordenamiento?: number | null;
}

export type TipoPropiedad = "fusion" | "padre-sin-hijos" | "padre-con-hijos" | "hijo";

export type PropiedadOrganizada<T> = T & { tipo: TipoPropiedad; tieneHijos: boolean };

/** ¿El campo apunta a otra área? (legacy: id numérico > 0; insulae2.0: UUID no vacío). */
export function tieneReferencia(id: AreaId | null | undefined): boolean {
  if (typeof id === "number") return id > 0;
  return Boolean(id);
}

/** Desempate del legacy (`a - b`): numérico si ambos ids lo son; con UUID conserva el orden de llegada. */
function compararIds(a: AreaId, b: AreaId): number {
  const diff = Number(a) - Number(b);
  return Number.isNaN(diff) ? 0 : diff;
}

export const organizarPropiedadesHierarquicamente = <T extends PropiedadOrganizable>(
  propiedades: T[],
): PropiedadOrganizada<T>[] => {
  // Identificar TODOS los IDs de padres únicos
  const padresIdsSet = new Set<AreaId>();

  propiedades.forEach((p) => {
    // Si no tiene padre y no apunta a otra área, es un padre. El legacy excluía además las
    // fusiones (se colocan antes del AP de `id_areas_privativas_hijo`), pero en insulae2.0 ese
    // campo siempre es null: una fusión sin referencia desaparecía de la tabla y del PDF.
    if (!p.id_areas_privativas_padre && !p.id_areas_privativas_hijo) {
      padresIdsSet.add(p.id_areas_privativas);
    }
    // Si tiene padre, agregar ese ID de padre al set (aunque el padre no venga en los datos)
    if (p.id_areas_privativas_padre != null && tieneReferencia(p.id_areas_privativas_padre)) {
      padresIdsSet.add(p.id_areas_privativas_padre);
    }
  });

  // Convertir a array y ordenar por el ordenamiento del padre.
  // Si el padre no viene en el dataset (ej: dominio pleno movido a FAPs),
  // usar el menor ordenamiento de sus hijos para conservar el orden visual.
  const padresIds = Array.from(padresIdsSet).sort((a, b) => {
    const padreA = propiedades.find((p) => p.id_areas_privativas === a);
    const padreB = propiedades.find((p) => p.id_areas_privativas === b);

    const hijoRefA = propiedades.find((p) => p.id_areas_privativas_padre === a);
    const hijoRefB = propiedades.find((p) => p.id_areas_privativas_padre === b);

    const ordenPadreOcultoA = hijoRefA?.parent_ordenamiento;
    const ordenPadreOcultoB = hijoRefB?.parent_ordenamiento;

    const ordenA =
      padreA?.ordenamiento ??
      ordenPadreOcultoA ??
      Math.min(
        ...propiedades.filter((p) => p.id_areas_privativas_padre === a).map((h) => h.ordenamiento ?? 999999),
        999999,
      );

    const ordenB =
      padreB?.ordenamiento ??
      ordenPadreOcultoB ??
      Math.min(
        ...propiedades.filter((p) => p.id_areas_privativas_padre === b).map((h) => h.ordenamiento ?? 999999),
        999999,
      );

    if (ordenA !== ordenB) return ordenA - ordenB;
    return compararIds(a, b);
  });

  // Crear un Set de IDs ya procesados para evitar duplicados
  const procesados = new Set<AreaId>();
  const resultado: PropiedadOrganizada<T>[] = [];

  // Procesar cada padre
  padresIds.forEach((padreId) => {
    if (procesados.has(padreId)) return;

    const padre = propiedades.find((p) => p.id_areas_privativas === padreId);

    // 1. Buscar fusiones para este padre y ordenar por ordenamiento
    const fusiones = propiedades
      .filter((p) => p.id_areas_privativas_hijo === padreId && !procesados.has(p.id_areas_privativas))
      .sort((a, b) => (a.ordenamiento ?? 999999) - (b.ordenamiento ?? 999999));

    // 2. Buscar hijos (fracciones) de este padre y ordenar por ordenamiento
    const hijos = propiedades
      .filter((p) => p.id_areas_privativas_padre === padreId && !procesados.has(p.id_areas_privativas))
      .sort((a, b) => (a.ordenamiento ?? 999999) - (b.ordenamiento ?? 999999));

    // Agregar fusiones primero (sepCol1)
    fusiones.forEach((fusion) => {
      resultado.push({
        ...fusion,
        tipo: "fusion",
        tieneHijos: false,
      });
      procesados.add(fusion.id_areas_privativas);
    });

    // Agregar el padre SOLO si existe en la lista del usuario
    if (padre) {
      resultado.push({
        ...padre,
        tipo: hijos.length > 0 ? "padre-con-hijos" : "padre-sin-hijos",
        tieneHijos: hijos.length > 0,
      });
      procesados.add(padreId);
    }

    // Agregar hijos (sepCol4) - SIEMPRE, incluso si el padre no existe
    hijos.forEach((hijo) => {
      resultado.push({
        ...hijo,
        tipo: "hijo",
        tieneHijos: false,
      });
      procesados.add(hijo.id_areas_privativas);
    });
  });

  return resultado;
};

/**
 * Función para agrupar propiedades por barrio
 * Ahora mantiene el orden de ordenamiento de la base de datos sin agrupar por barrio
 * Esto permite que propiedades como 322, 330, 331, 332, 343 mantengan su orden original
 */
export const agruparPorBarrio = <T>(propiedadesOrganizadas: T[]) => {
  // En lugar de agrupar por barrio, mantenemos todas las propiedades en un mismo grupo
  // pero preservamos el orden de ordenamiento que ya viene aplicado
  const grupos: Record<string, T[]> = {
    Todas: propiedadesOrganizadas,
  };
  const ordenBarrios = ["Todas"];

  return { grupos, ordenBarrios };
};
