/**
 * Catálogo tipado de módulos del sistema (tabla ModuleCatalog).
 *
 * Los nombres deben coincidir letra por letra con `ModuleCatalog.name`, porque la
 * matriz de permisos (RolePermission) se resuelve por ese nombre. Usar estas
 * constantes en páginas, acciones y menú evita errores tipográficos silenciosos
 * que ocultarían un módulo a todo el mundo.
 */
export const MODULES = {
  ROLES: "Roles",
  DIRECTORIO: "Directorio",
  CONDOMINIO: "Condominio",
  AREAS_PRIVATIVAS: "Areas privativas",
  USOS_DE_SUELO: "Usos de suelo",
  BARRIOS: "Barrios",
  COBROS: "Cobros",
  ARRENDAR: "Arrendar",
  REPORTE_CONDOMINIO: "Reporte condominio",
  CONVOCATORIAS: "Convocatorias",
  PRESUPUESTO: "Presupuesto",
  ESTRUCTURA_CONDOMINAL: "Estructura condominal",
  RESUMEN_FINANCIERO: "Resumen financiero",
  COBROS_HISTORICO: "Cobros historico",
  CONVOCATORIAS_CONDOMINO: "Convocatorias condómino",
  AGREGAR_VARIOS_PRESUPUESTO: "Agregar varios presupuesto",
  OTROS_INGRESOS: "Otros ingresos",
  COBROS_MASIVOS: "Cobros masivos",
  ESTRUCTURA_PRESUPUESTO: "Estructura Presupuesto",
  NOTIFICACIONES: "Notificaciones",
  TICKETS: "Tickets",
  GASTOS: "Gastos",
  CATEGORIAS_NOTIFICACIONES: "Categorías notificaciones",
  CATEGORIAS_GASTOS: "Categorías gastos",
  DEPARTAMENTOS_TICKETS: "Departamentos tickets",
  GENERAR_ESTRUCTURA_CONDOMINAL: "Generar estructura condominal",
  CONTACTOS: "Contactos",
  REGLAMENTOS: "Reglamentos",
  CATALOGO_SANCIONES: "Catálogo de sanciones",
  AREAS_PRIVATIVAS_CASETA: "Áreas Privativas para caseta de seguridad",
  CAMBIO_FECHA_HISTORICO_PAGOS: "Cambio de fecha en histórico de pagos",
  SINCRONIZACION_LUCA: "Sincronización Luca",
} as const;

export type ModuleName = (typeof MODULES)[keyof typeof MODULES];

export const ALL_MODULE_NAMES: readonly ModuleName[] = Object.values(MODULES);
