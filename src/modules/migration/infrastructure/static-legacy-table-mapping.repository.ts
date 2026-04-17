import type { LegacyTableMapping } from "../domain/legacy-table-mapping";
import type { LegacyTableMappingRepository } from "../domain/legacy-table-mapping.repository";

const STATIC_MAPPINGS: LegacyTableMapping[] = [
  { legacyTable: "AREAS_PRIVATIVAS", action: "migrar" },
  { legacyTable: "AREAS_PRIVATIVAS_HAS_CUOTAS", action: "migrar" },
  { legacyTable: "AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO", action: "migrar" },
  { legacyTable: "ARRENDAMIENTOS", action: "migrar" },
  { legacyTable: "CAT_TIPOS_CONTACTO", action: "migrar" },
  { legacyTable: "DCAT_CATEGORIAS_NOTIFICACIONES", action: "migrar" },
  { legacyTable: "CONTACTOS", action: "migrar" },
  { legacyTable: "DIRECTORIO", action: "migrar" },
  { legacyTable: "DIRECTORIO_HAS_ASIGNACIONES", action: "migrar" },
  { legacyTable: "PAGOS", action: "migrar" },
  { legacyTable: "HISTORICO_PAGOS", action: "migrar" },
  { legacyTable: "HISTORICO_PAGOS_DETALLE", action: "migrar" },
  { legacyTable: "HISTORICO_PAGOS_HAS_PAGOS", action: "migrar" },
  { legacyTable: "INGRESOS", action: "migrar" },
  { legacyTable: "GASTOS", action: "migrar" },
  { legacyTable: "PRESUPUESTO", action: "migrar" },
  { legacyTable: "PRESUPUESTO_DETALLE", action: "migrar" },
  { legacyTable: "PRESUPUESTO_MES", action: "migrar" },
  { legacyTable: "CONVOCATORIAS", action: "migrar" },
  { legacyTable: "TICKETS_DEPARTAMENTOS", action: "migrar" },
  { legacyTable: "TICKETS", action: "migrar" },
  { legacyTable: "NOTIFICACIONES", action: "migrar" },
  { legacyTable: "ROLES_CONDOMINAL", action: "migrar" },
  { legacyTable: "PROYECTOS", action: "migrar" },
  { legacyTable: "PROYECTOS_DOCUMENTOS", action: "migrar" },
  {
    legacyTable: "CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203",
    action: "no_migrar",
    reason: "Tabla backup histórica",
  },
  {
    legacyTable: "CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203",
    action: "no_migrar",
    reason: "Tabla backup histórica",
  },
  {
    legacyTable: "TOURS",
    action: "no_migrar",
    reason: "Fuera de alcance de Valquirico condominial",
  },
  {
    legacyTable: "artistas",
    action: "no_migrar",
    reason: "Fuera de alcance de Valquirico condominial",
  },
  {
    legacyTable: "PASSWORD_RESET_TOKENS",
    action: "reemplazar",
    reason: "Será reemplazada por auth moderno",
  },
];

export class StaticLegacyTableMappingRepository
  implements LegacyTableMappingRepository
{
  async getAll(): Promise<LegacyTableMapping[]> {
    return STATIC_MAPPINGS;
  }
}
