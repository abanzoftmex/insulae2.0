export interface StatisticsFilters {
  zone: string | null;
  useType: string | null;
}

export interface NameCount {
  name: string;
  value: number;
}

export interface YearCount {
  year: number;
  value: number;
}

export interface MonthPoint {
  /** "YYYY-MM" */
  month: string;
  count: number;
  amount: number;
}

export interface BusinessLineStat {
  name: string;
  /** Negocios con este giro en algún slot */
  businesses: number;
  /** Participación % sobre negocios clasificados */
  share: number;
}

/** Clasificación de inmuebles derivada del uso de suelo */
export type AreaCategory = "Habitacional" | "Comercial / Servicios" | "Lote / Suelo" | "Sin clasificar";

export interface OccupancyStats {
  occupied: number;
  unoccupied: number;
  rate: number;
}

/** Cruce barrio × clasificación de inmueble, para la matriz de calor */
export interface ZoneCategoryCell {
  zone: string;
  total: number;
  counts: Record<string, number>;
}

/** Ocupación desglosada por barrio, para la barra apilada */
export interface ZoneOccupancy {
  zone: string;
  occupied: number;
  vacant: number;
  total: number;
  rate: number;
}

export interface AttendanceStats {
  totalAnnouncements: number;
  averageAttendancePct: number | null;
}

export interface ContactCoverage {
  totalActiveUsers: number;
  withEmail: number;
  withPhone: number;
}

export interface StatisticsReport {
  generatedAt: Date;
  condominiumName: string;
  filters: StatisticsFilters;
  availableZones: string[];
  availableUseTypes: string[];

  // KPIs de inmuebles
  totalPrivateAreas: number;
  parentPrivateAreas: number;
  childPrivateAreas: number;
  residentialAreas: number;
  commercialAreas: number;
  landAreas: number;
  unclassifiedAreas: number;
  builtAreas: number;
  unbuiltAreas: number;
  occupancy: OccupancyStats;

  // KPIs de propietarios
  totalOwners: number;
  ownersWithMultipleAreas: number;
  ownersByAreaCount: NameCount[];
  ownershipByRole: NameCount[];
  tenantsCount: number;

  // Negocios / actividad económica
  totalBusinesses: number;
  activeBusinesses: number;
  areasWithActiveBusiness: number;
  /** null cuando el catálogo de giros aún no está migrado */
  businessesByLine: BusinessLineStat[] | null;
  businessesByCategoryTop: NameCount[] | null;
  businessesByClass: NameCount[] | null;
  classifiedBusinesses: number | null;
  businessLinesCount: number | null;
  businessesByZone: NameCount[];
  businessOpeningsByYear: YearCount[];

  // Distribuciones de inmuebles
  areasByZone: NameCount[];
  areasByUseType: NameCount[];
  /** Usos de suelo con su clasificación, para colorear el treemap por tipo */
  areasByUseTypeCategorized: { name: string; value: number; category: string }[];
  areasByCategory: NameCount[];
  /** Matriz barrio × clasificación */
  zoneCategoryMatrix: ZoneCategoryCell[];
  categoryOrder: string[];
  /** Ocupación por barrio (barra apilada) */
  occupancyByZone: ZoneOccupancy[];
  /** m² construidos por barrio */
  builtM2ByZone: NameCount[];
  totalBuiltM2: number;

  // Actividad y cobranza
  paymentsByMonth: MonthPoint[];
  paymentsByMethod: NameCount[];
  areasWithDebt: number;
  ticketsByStatus: NameCount[];
  totalTickets: number;
  attendance: AttendanceStats;
  contactCoverage: ContactCoverage;

  caveats: string[];
}

/** Identificadores de las tarjetas KPI que abren un detalle a pantalla completa */
export type KpiKey =
  | "owners"
  | "areas"
  | "businesses"
  | "occupancy"
  | "residential"
  | "commercial"
  | "land"
  | "built";

export const KPI_KEYS: KpiKey[] = [
  "owners",
  "areas",
  "businesses",
  "occupancy",
  "residential",
  "commercial",
  "land",
  "built",
];

export function isKpiKey(value: string): value is KpiKey {
  return (KPI_KEYS as string[]).includes(value);
}

export interface KpiDetailColumn {
  key: string;
  label: string;
  /** Alinea a la derecha y formatea como número */
  numeric?: boolean;
  /** Ancho sugerido en la tabla (clase Tailwind) */
  width?: string;
  /** Listas largas: recorta a dos líneas y deja el valor completo en el tooltip */
  clamp?: boolean;
  /** Evita que el valor se parta en varias líneas (correos, teléfonos, fechas) */
  nowrap?: boolean;
}

/** Forma con la que se dibuja cada bloque del detalle */
export type KpiChartKind = "bars" | "donut" | "columns" | "progress";

/** De dónde toma el color: identidad por clasificación/giro, magnitud, o serie única */
export type KpiChartPalette = "category" | "business" | "sequential" | "series";

export interface KpiDetailChart {
  title: string;
  data: NameCount[];
  /** Sufijo de unidad para las etiquetas (p. ej. " m²") */
  suffix?: string;
  kind?: KpiChartKind;
  palette?: KpiChartPalette;
  /** Ocupa el ancho completo de la rejilla del modal */
  wide?: boolean;
  /** Texto de apoyo bajo el título */
  subtitle?: string;
  /** Etiqueta del centro de la dona */
  centerLabel?: string;
}

export type KpiDetailRow = Record<string, string | number>;

export interface KpiDetail {
  key: KpiKey;
  title: string;
  subtitle: string;
  /** Tarjetas de resumen que encabezan el modal */
  headline: { label: string; value: string; hint?: string }[];
  charts: KpiDetailChart[];
  columns: KpiDetailColumn[];
  rows: KpiDetailRow[];
  /** Nombre de la tabla para el export */
  tableTitle: string;
  notes: string[];
}

export interface StatisticsRepository {
  getReport(filters: StatisticsFilters): Promise<StatisticsReport | null>;
  getKpiDetail(key: KpiKey, filters: StatisticsFilters): Promise<KpiDetail | null>;
}
