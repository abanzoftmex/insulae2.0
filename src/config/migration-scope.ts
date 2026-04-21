export type MigrationLayerName =
  | "master_data"
  | "core_entities"
  | "financial"
  | "operations";

export interface MigrationLayer {
  name: MigrationLayerName;
  description: string;
  tables: string[];
}

export const MIGRATION_INCLUDED_TABLES = [
  "CAT_FORMAS_PAGO",
  "CAT_GRUPOS_COBRO",
  "CAT_GRUPO_PUESTOS",
  "CAT_PUESTOS",
  "CAT_TIPOS_CONTACTO",
  "DCAT_CATEGORIAS_NOTIFICACIONES",
  "DCAT_ZONAS",
  "DCAT_SUBZONAS",
  "DCAT_USO_SUELO",
  "DCAT_VARIOS",
  "AREAS_PRIVATIVAS",
  "AREAS_PRIVATIVAS_HAS_CUOTAS",
  "AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO",
  "ARRENDAMIENTOS",
  "DIRECTORIO",
  "DIRECTORIO_HAS_CAT_PUESTOS",
  "DIRECTORIO_HAS_ASIGNACIONES",
  "PAGOS",
  "HISTORICO_PAGOS",
  "HISTORICO_PAGOS_DETALLE",
  "HISTORICO_PAGOS_HAS_PAGOS",
  "INGRESOS",
  "GASTOS",
  "PRESUPUESTO",
  "CAT_CONCEPTOS_PRESUPUESTO",
  "PRESUPUESTO_DETALLE",
  "PRESUPUESTO_MES",
  "CONVOCATORIAS",
  "TICKETS_DEPARTAMENTOS",
  "TICKETS",
  "NOTIFICACIONES",
  "CONTACTOS",
  "ROLES_CONDOMINAL",
  "PROYECTOS",
  "PROYECTOS_DOCUMENTOS",
] as const;

export const MIGRATION_EXCLUDED_TABLES = [
  "CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203",
  "CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203",
  "TOURS",
  "artistas",
  "PASSWORD_RESET_TOKENS",
] as const;

export const MIGRATION_LAYERS: MigrationLayer[] = [
  {
    name: "master_data",
    description: "Catalogos y maestros base",
    tables: [
      "ROLES_CONDOMINAL",
      "CAT_FORMAS_PAGO",
      "CAT_GRUPOS_COBRO",
      "CAT_GRUPO_PUESTOS",
      "CAT_PUESTOS",
      "CAT_TIPOS_CONTACTO",
      "DCAT_CATEGORIAS_NOTIFICACIONES",
      "DCAT_ZONAS",
      "DCAT_SUBZONAS",
      "DCAT_USO_SUELO",
      "DCAT_VARIOS",
    ],
  },
  {
    name: "core_entities",
    description: "Entidades nucleo del condominio",
    tables: [
      "DIRECTORIO",
      "AREAS_PRIVATIVAS",
      "AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO",
      "AREAS_PRIVATIVAS_HAS_CUOTAS",
      "DIRECTORIO_HAS_ASIGNACIONES",
      "DIRECTORIO_HAS_CAT_PUESTOS",
      "ARRENDAMIENTOS",
    ],
  },
  {
    name: "financial",
    description: "Movimientos financieros y presupuesto",
    tables: [
      "PAGOS",
      "HISTORICO_PAGOS",
      "HISTORICO_PAGOS_DETALLE",
      "HISTORICO_PAGOS_HAS_PAGOS",
      "INGRESOS",
      "GASTOS",
      "PRESUPUESTO",
      "CAT_CONCEPTOS_PRESUPUESTO",
      "PRESUPUESTO_DETALLE",
      "PRESUPUESTO_MES",
    ],
  },
  {
    name: "operations",
    description: "Operacion diaria y comunicacion",
    tables: [
      "TICKETS_DEPARTAMENTOS",
      "TICKETS",
      "NOTIFICACIONES",
      "CONTACTOS",
      "CONVOCATORIAS",
      "PROYECTOS",
      "PROYECTOS_DOCUMENTOS",
    ],
  },
];

export function findLayerByTable(legacyTable: string): MigrationLayer | null {
  return MIGRATION_LAYERS.find((layer) => layer.tables.includes(legacyTable)) ?? null;
}

export function getIncludedTablesWithoutLayer(): string[] {
  const coveredTables = new Set(MIGRATION_LAYERS.flatMap((layer) => layer.tables));
  return MIGRATION_INCLUDED_TABLES.filter((table) => !coveredTables.has(table));
}
