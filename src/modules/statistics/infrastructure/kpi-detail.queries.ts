import { prisma } from "@/shared/infrastructure/db/prisma";
import type {
  AreaCategory,
  KpiDetail,
  KpiDetailChart,
  KpiDetailColumn,
  KpiKey,
  NameCount,
  StatisticsFilters,
} from "../domain/statistics";
import { classifyUseType } from "./prisma-statistics.repository";

const OWNER_ROLES = ["Dueño Legal", "Dueño Moral", "Dominio pleno"];
const ACTIVE_RENTAL_STATUS = "1";
const MIN_VALID_YEAR = 2010;

const numberFormat = new Intl.NumberFormat("es-MX");
const decimalFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

function fmt(value: number): string {
  return numberFormat.format(Math.round(value));
}

function fmtM2(value: number): string {
  return `${decimalFormat.format(value)} m²`;
}

function toNameCounts(map: Map<string, number>, limit?: number): NameCount[] {
  const rows = [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return limit ? rows.slice(0, limit) : rows;
}

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function displayName(user: {
  userType: string;
  firstName: string | null;
  lastName: string | null;
  lastNamePaterno: string | null;
  lastNameMaterno: string | null;
  businessName: string | null;
  commercialName: string | null;
}): string {
  if (user.userType === "LEGAL_ENTITY") {
    const legal = user.businessName ?? user.commercialName;
    if (legal?.trim()) return legal.trim();
  }
  const surname = user.lastName?.trim() || [user.lastNamePaterno, user.lastNameMaterno].filter(Boolean).join(" ").trim();
  const full = [user.firstName?.trim(), surname].filter(Boolean).join(" ").trim();
  return full || user.businessName?.trim() || "Sin nombre";
}

interface EnrichedArea {
  id: string;
  label: string;
  zone: string;
  subzone: string;
  useType: string;
  category: AreaCategory;
  isParent: boolean;
  m2Construction: number;
  m2Land: number;
  ownerNames: string[];
  ownerRoles: string[];
  residentCount: number;
  businessNames: string[];
  hasActiveBusiness: boolean;
  occupied: boolean;
  occupancyReason: string;
}

interface DetailDataset {
  areas: EnrichedArea[];
  owners: {
    id: string;
    name: string;
    isLegalEntity: boolean;
    email: string;
    phone: string;
    roles: Set<string>;
    zones: Set<string>;
    areaLabels: string[];
  }[];
  businesses: {
    name: string;
    areaLabel: string;
    zone: string;
    lines: string[];
    categories: string[];
    businessClass: string;
    startYear: number | null;
    startLabel: string;
  }[];
  totalRentals: number;
}

/** Carga una sola vez todo lo que necesitan los 8 detalles, respetando los filtros. */
async function loadDataset(cid: string, filters: StatisticsFilters): Promise<DetailDataset> {
  const areaRows = await prisma.privateArea.findMany({
    where: {
      condominiumId: cid,
      isActive: true,
      ...(filters.zone ? { zone: filters.zone } : {}),
      ...(filters.useType ? { useType: filters.useType } : {}),
    },
    select: {
      id: true,
      name: true,
      code: true,
      zone: true,
      subzone: true,
      useType: true,
      parentPrivateAreaId: true,
      m2Construction: true,
      m2Original: true,
      assignments: {
        where: { isActive: true },
        select: {
          roleName: true,
          user: {
            select: {
              id: true,
              userType: true,
              firstName: true,
              lastName: true,
              lastNamePaterno: true,
              lastNameMaterno: true,
              businessName: true,
              commercialName: true,
              email: true,
              personalEmail: true,
              phone: true,
              personalPhone: true,
            },
          },
        },
      },
      rentals: {
        select: {
          id: true,
          tenantName: true,
          status: true,
          startsAt: true,
          businessClass: true,
          commerce: { select: { name: true } },
        },
      },
    },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
  });

  // Giros: tabla opcional (migración 'business_lines_catalogs'). Se consulta
  // aparte para que su ausencia no rompa el detalle completo.
  const linesByRentalId = new Map<string, { line: string; category: string | null }[]>();
  try {
    const [probe] = await prisma.$queryRaw<{ exists: string | null }[]>`
      SELECT to_regclass('public."RentalBusinessLine"')::text AS exists`;
    if (probe?.exists) {
      const lines = await prisma.rentalBusinessLine.findMany({
        where: { condominiumId: cid },
        select: {
          rentalId: true,
          businessLine: { select: { name: true } },
          category: { select: { name: true } },
        },
      });
      for (const line of lines) {
        if (!linesByRentalId.has(line.rentalId)) linesByRentalId.set(line.rentalId, []);
        linesByRentalId.get(line.rentalId)!.push({
          line: line.businessLine.name,
          category: line.category?.name ?? null,
        });
      }
    }
  } catch {
    // Catálogo de giros no disponible: las columnas de giro quedan vacías.
  }

  const areas: EnrichedArea[] = [];
  const ownersById = new Map<string, DetailDataset["owners"][number]>();
  const businesses: DetailDataset["businesses"] = [];
  let totalRentals = 0;

  for (const area of areaRows) {
    const label = area.code?.trim() || area.name;
    const zone = area.zone?.trim() || "Sin barrio";
    const useType = area.useType?.trim() || "Sin uso asignado";
    const ownerNames: string[] = [];
    const ownerRoles: string[] = [];
    let residentCount = 0;

    for (const assignment of area.assignments) {
      const role = assignment.roleName ?? "Sin rol";
      residentCount += 1;
      if (!ownerRoles.includes(role)) ownerRoles.push(role);
      if (!OWNER_ROLES.includes(role)) continue;

      const name = displayName(assignment.user);
      if (!ownerNames.includes(name)) ownerNames.push(name);

      const existing = ownersById.get(assignment.user.id);
      const owner =
        existing ??
        {
          id: assignment.user.id,
          name,
          isLegalEntity: assignment.user.userType === "LEGAL_ENTITY",
          email: assignment.user.email?.trim() || assignment.user.personalEmail?.trim() || "—",
          phone: assignment.user.phone?.trim() || assignment.user.personalPhone?.trim() || "—",
          roles: new Set<string>(),
          zones: new Set<string>(),
          areaLabels: [] as string[],
        };
      owner.roles.add(role);
      owner.zones.add(zone);
      if (!owner.areaLabels.includes(label)) owner.areaLabels.push(label);
      if (!existing) ownersById.set(assignment.user.id, owner);
    }

    const businessNames: string[] = [];
    let hasActiveBusiness = false;
    for (const rental of area.rentals) {
      totalRentals += 1;
      if (rental.status !== ACTIVE_RENTAL_STATUS) continue;
      hasActiveBusiness = true;
      const name = rental.commerce?.name?.trim() || rental.tenantName?.trim() || "Sin nombre";
      if (!businessNames.includes(name)) businessNames.push(name);

      const rentalLines = linesByRentalId.get(rental.id) ?? [];
      const lines = [...new Set(rentalLines.map((l) => l.line))];
      const categories = [...new Set(rentalLines.map((l) => l.category).filter((c): c is string => !!c))];
      const year = rental.startsAt?.getFullYear() ?? null;
      const validYear = year !== null && year >= MIN_VALID_YEAR && year <= new Date().getFullYear() + 1 ? year : null;
      businesses.push({
        name,
        areaLabel: label,
        zone,
        lines,
        categories,
        businessClass: rental.businessClass?.trim() || "—",
        startYear: validYear,
        startLabel: validYear
          ? rental.startsAt!.toLocaleDateString("es-MX", { year: "numeric", month: "short" })
          : "Sin fecha válida",
      });
    }

    const occupied = ownerNames.length > 0 || residentCount > 0 || hasActiveBusiness;
    const occupancyReason = !occupied
      ? "Sin asignar"
      : residentCount > 0 && hasActiveBusiness
        ? "Residente y negocio"
        : hasActiveBusiness
          ? "Negocio activo"
          : "Residente asignado";

    areas.push({
      id: area.id,
      label,
      zone,
      subzone: area.subzone?.trim() || "—",
      useType,
      category: classifyUseType(area.useType),
      isParent: area.parentPrivateAreaId === null,
      m2Construction: area.m2Construction ? Number(area.m2Construction) : 0,
      m2Land: area.m2Original ? Number(area.m2Original) : 0,
      ownerNames,
      ownerRoles,
      residentCount,
      businessNames,
      hasActiveBusiness,
      occupied,
      occupancyReason,
    });
  }

  const owners = [...ownersById.values()].sort(
    (a, b) => b.areaLabels.length - a.areaLabels.length || a.name.localeCompare(b.name),
  );

  return { areas, owners, businesses, totalRentals };
}

// ─── Bloques reutilizables ────────────────────────────────────────────────────

function chartByZone(areas: EnrichedArea[], title: string): KpiDetailChart {
  const map = new Map<string, number>();
  for (const area of areas) bump(map, area.zone);
  return { title, data: toNameCounts(map) };
}

function chartByUseType(areas: EnrichedArea[], title: string, limit = 10): KpiDetailChart {
  const map = new Map<string, number>();
  for (const area of areas) bump(map, area.useType);
  return { title, data: toNameCounts(map, limit) };
}

function areaColumns(extra: KpiDetailColumn[] = []): KpiDetailColumn[] {
  return [
    { key: "inmueble", label: "Inmueble", width: "w-[150px]", nowrap: true },
    { key: "barrio", label: "Barrio", nowrap: true },
    { key: "uso", label: "Uso de suelo", clamp: true },
    ...extra,
  ];
}

function areaRow(area: EnrichedArea) {
  return {
    inmueble: area.label,
    barrio: area.zone,
    uso: area.useType,
  };
}

// ─── Detalle por KPI ──────────────────────────────────────────────────────────

export async function loadKpiDetail(
  cid: string,
  key: KpiKey,
  filters: StatisticsFilters,
): Promise<KpiDetail> {
  const { areas, owners, businesses, totalRentals } = await loadDataset(cid, filters);

  const scopeNote = [
    filters.zone ? `barrio ${filters.zone}` : null,
    filters.useType ? `uso de suelo ${filters.useType}` : null,
  ].filter(Boolean);
  const notes: string[] = scopeNote.length
    ? [`Los datos respetan los filtros activos (${scopeNote.join(" · ")}).`]
    : [];

  switch (key) {
    case "owners": {
      const buckets = new Map<string, number>([
        ["1 inmueble", 0],
        ["2 a 5 inmuebles", 0],
        ["6 o más inmuebles", 0],
      ]);
      const byZone = new Map<string, number>();
      const byRole = new Map<string, number>();
      let multi = 0;
      let withEmail = 0;
      let totalAreas = 0;
      let maxAreas = 0;
      for (const owner of owners) {
        const count = owner.areaLabels.length;
        totalAreas += count;
        maxAreas = Math.max(maxAreas, count);
        if (count > 1) multi += 1;
        if (count === 1) bump(buckets, "1 inmueble");
        else if (count <= 5) bump(buckets, "2 a 5 inmuebles");
        else bump(buckets, "6 o más inmuebles");
        if (owner.email !== "—") withEmail += 1;
        for (const zone of owner.zones) bump(byZone, zone);
        for (const role of owner.roles) bump(byRole, role);
      }

      return {
        key,
        title: "Propietarios",
        subtitle: "Personas y sociedades con al menos un inmueble asignado como Dueño Legal, Dueño Moral o Dominio pleno.",
        headline: [
          { label: "Propietarios", value: fmt(owners.length) },
          { label: "Con más de un inmueble", value: fmt(multi), hint: owners.length ? `${((multi / owners.length) * 100).toFixed(1)}% del total` : undefined },
          { label: "Inmuebles por propietario", value: owners.length ? (totalAreas / owners.length).toFixed(2) : "0", hint: "Promedio" },
          { label: "Mayor concentración", value: fmt(maxAreas), hint: "Inmuebles de un solo propietario" },
          { label: "Con correo registrado", value: owners.length ? `${((withEmail / owners.length) * 100).toFixed(0)}%` : "0%", hint: `${fmt(withEmail)} propietarios` },
        ],
        charts: [
          { title: "Propietarios por número de inmuebles", data: [...buckets.entries()].map(([name, value]) => ({ name, value })) },
          { title: "Propietarios con presencia en cada barrio", data: toNameCounts(byZone) },
          { title: "Figura de propiedad", data: toNameCounts(byRole) },
        ],
        columns: [
          { key: "propietario", label: "Propietario", width: "w-[220px]" },
          { key: "inmuebles", label: "Inmuebles", numeric: true },
          { key: "barrios", label: "Barrios", clamp: true },
          { key: "figura", label: "Figura de propiedad", clamp: true },
          { key: "detalle", label: "Inmuebles asignados", clamp: true },
          { key: "email", label: "Correo", nowrap: true },
          { key: "telefono", label: "Teléfono", nowrap: true },
        ],
        rows: owners.map((owner) => ({
          propietario: owner.name,
          inmuebles: owner.areaLabels.length,
          barrios: [...owner.zones].sort().join(", "),
          figura: [...owner.roles].sort().join(", "),
          detalle: owner.areaLabels.join(", "),
          email: owner.email,
          telefono: owner.phone,
        })),
        tableTitle: "Propietarios",
        notes: [
          ...notes,
          "Un propietario puede aparecer con varias figuras si tiene distintos inmuebles.",
        ],
      };
    }

    case "areas": {
      const parents = areas.filter((a) => a.isParent).length;
      const built = areas.filter((a) => a.m2Construction > 0);
      const totalM2 = built.reduce((sum, a) => sum + a.m2Construction, 0);
      const byCategory = new Map<string, number>();
      for (const area of areas) bump(byCategory, area.category);

      return {
        key,
        title: "Inmuebles activos",
        subtitle: "Todas las áreas privativas activas del condominio, con su barrio, uso de suelo, propietarios y negocio.",
        headline: [
          { label: "Inmuebles activos", value: fmt(areas.length) },
          { label: "Predios", value: fmt(parents), hint: `${fmt(areas.length - parents)} unidades dentro de predios` },
          { label: "Con construcción", value: fmt(built.length) },
          { label: "Superficie construida", value: fmtM2(totalM2) },
          { label: "Con propietario", value: fmt(areas.filter((a) => a.ownerNames.length > 0).length) },
        ],
        charts: [
          chartByZone(areas, "Inmuebles por barrio"),
          chartByUseType(areas, "Top usos de suelo"),
          { title: "Clasificación", data: toNameCounts(byCategory) },
        ],
        columns: areaColumns([
          { key: "categoria", label: "Clasificación" },
          { key: "tipo", label: "Tipo" },
          { key: "m2", label: "m² construcción", numeric: true },
          { key: "propietarios", label: "Propietarios", clamp: true },
          { key: "negocio", label: "Negocio activo", clamp: true },
        ]),
        rows: areas.map((area) => ({
          ...areaRow(area),
          categoria: area.category,
          tipo: area.isParent ? "Predio" : "Unidad",
          m2: Math.round(area.m2Construction * 100) / 100,
          propietarios: area.ownerNames.join(", ") || "—",
          negocio: area.businessNames.join(", ") || "—",
        })),
        tableTitle: "Inmuebles",
        notes,
      };
    }

    case "businesses": {
      const byLine = new Map<string, number>();
      const byCategory = new Map<string, number>();
      const byZone = new Map<string, number>();
      const byYear = new Map<string, number>();
      const byClass = new Map<string, number>();
      let classified = 0;
      for (const business of businesses) {
        if (business.lines.length > 0) classified += 1;
        for (const line of business.lines) bump(byLine, line);
        for (const category of business.categories) bump(byCategory, category);
        bump(byZone, business.zone);
        if (business.startYear) bump(byYear, String(business.startYear));
        if (business.businessClass !== "—") bump(byClass, `Clase ${business.businessClass}`);
      }
      const openings = [...byYear.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        key,
        title: "Negocios activos",
        subtitle: "Arrendamientos comerciales vigentes, con su giro, categoría, inmueble y fecha de apertura.",
        headline: [
          { label: "Negocios activos", value: fmt(businesses.length) },
          { label: "Registrados históricos", value: fmt(totalRentals), hint: "Incluye no vigentes" },
          { label: "Con giro asignado", value: fmt(classified), hint: businesses.length ? `${((classified / businesses.length) * 100).toFixed(0)}% clasificados` : undefined },
          { label: "Giros representados", value: fmt(byLine.size) },
          { label: "Inmuebles con negocio", value: fmt(areas.filter((a) => a.hasActiveBusiness).length) },
        ],
        charts: [
          { title: "Negocios por giro", data: toNameCounts(byLine) },
          { title: "Top categorías comerciales", data: toNameCounts(byCategory, 10) },
          { title: "Negocios por barrio", data: toNameCounts(byZone) },
          { title: "Aperturas por año", data: openings },
          ...(byClass.size ? [{ title: "Clase de comercio", data: toNameCounts(byClass) }] : []),
        ],
        columns: [
          { key: "negocio", label: "Negocio", width: "w-[220px]" },
          { key: "inmueble", label: "Inmueble" },
          { key: "barrio", label: "Barrio" },
          { key: "giro", label: "Giro", clamp: true },
          { key: "categoria", label: "Categoría", clamp: true },
          { key: "clase", label: "Clase" },
          { key: "inicio", label: "Inicio", nowrap: true },
        ],
        rows: businesses
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((business) => ({
            negocio: business.name,
            inmueble: business.areaLabel,
            barrio: business.zone,
            giro: business.lines.join(", ") || "Sin giro",
            categoria: business.categories.join(", ") || "—",
            clase: business.businessClass,
            inicio: business.startLabel,
          })),
        tableTitle: "Negocios activos",
        notes: [
          ...notes,
          businesses.length - classified > 0
            ? `${fmt(businesses.length - classified)} negocios activos no tienen giro capturado en el sistema anterior.`
            : "",
        ].filter(Boolean),
      };
    }

    case "occupancy": {
      const occupied = areas.filter((a) => a.occupied);
      const vacant = areas.filter((a) => !a.occupied);
      const byReason = new Map<string, number>();
      for (const area of occupied) bump(byReason, area.occupancyReason);
      const vacantByZone = new Map<string, number>();
      for (const area of vacant) bump(vacantByZone, area.zone);
      const rateByZone = new Map<string, number>();
      const totalByZone = new Map<string, number>();
      for (const area of areas) {
        bump(totalByZone, area.zone);
        if (area.occupied) bump(rateByZone, area.zone);
      }
      const occupancyPct = new Map<string, number>();
      for (const [zone, total] of totalByZone) {
        occupancyPct.set(zone, Math.round(((rateByZone.get(zone) ?? 0) / total) * 1000) / 10);
      }

      return {
        key,
        title: "Ocupación de inmuebles",
        subtitle: "Un inmueble cuenta como ocupado cuando tiene residente asignado o un negocio activo.",
        headline: [
          { label: "Ocupación", value: areas.length ? `${((occupied.length / areas.length) * 100).toFixed(1)}%` : "0%" },
          { label: "Ocupados", value: fmt(occupied.length) },
          { label: "Sin ocupar", value: fmt(vacant.length) },
          { label: "Por residente", value: fmt(areas.filter((a) => a.residentCount > 0 && !a.hasActiveBusiness).length) },
          { label: "Por negocio", value: fmt(areas.filter((a) => a.hasActiveBusiness).length) },
        ],
        charts: [
          { title: "Ocupación por barrio (%)", data: toNameCounts(occupancyPct), suffix: "%" },
          { title: "Motivo de ocupación", data: toNameCounts(byReason) },
          ...(vacant.length ? [{ title: "Inmuebles sin ocupar por barrio", data: toNameCounts(vacantByZone) }] : []),
        ],
        columns: areaColumns([
          { key: "estado", label: "Estado" },
          { key: "motivo", label: "Motivo" },
          { key: "residentes", label: "Residentes", numeric: true },
          { key: "propietarios", label: "Propietarios", clamp: true },
          { key: "negocio", label: "Negocio activo", clamp: true },
        ]),
        rows: areas
          .slice()
          .sort((a, b) => Number(a.occupied) - Number(b.occupied) || a.zone.localeCompare(b.zone))
          .map((area) => ({
            ...areaRow(area),
            estado: area.occupied ? "Ocupado" : "Sin ocupar",
            motivo: area.occupancyReason,
            residentes: area.residentCount,
            propietarios: area.ownerNames.join(", ") || "—",
            negocio: area.businessNames.join(", ") || "—",
          })),
        tableTitle: "Ocupación",
        notes: [
          ...notes,
          "El estatus propio del área privativa no se mantiene al día, por eso la ocupación se deriva de asignaciones y arrendamientos.",
        ],
      };
    }

    case "residential":
    case "commercial":
    case "land": {
      const categoryByKey: Record<string, AreaCategory> = {
        residential: "Habitacional",
        commercial: "Comercial / Servicios",
        land: "Lote / Suelo",
      };
      const category = categoryByKey[key];
      const subset = areas.filter((a) => a.category === category);
      const occupied = subset.filter((a) => a.occupied).length;
      const built = subset.filter((a) => a.m2Construction > 0);
      const totalM2 = built.reduce((sum, a) => sum + a.m2Construction, 0);

      const titles: Record<string, { title: string; subtitle: string }> = {
        residential: {
          title: "Viviendas",
          subtitle: "Inmuebles de uso habitacional: lofts, departamentos y casas.",
        },
        commercial: {
          title: "Locales y servicios",
          subtitle: "Inmuebles de uso comercial, de servicios y hotelería.",
        },
        land: {
          title: "Lotes y suelo",
          subtitle: "Lotes de terreno por zona, incluidos los lotes carreteros.",
        },
      };

      const charts: KpiDetailChart[] = [
        chartByUseType(subset, "Por uso de suelo"),
        chartByZone(subset, "Por barrio"),
      ];
      if (key === "commercial") {
        const withBusiness = new Map<string, number>();
        for (const area of subset) {
          bump(withBusiness, area.hasActiveBusiness ? "Con negocio activo" : "Sin negocio activo");
        }
        charts.push({ title: "Actividad comercial", data: toNameCounts(withBusiness) });
      } else if (key === "land") {
        const buildStatus = new Map<string, number>();
        for (const area of subset) {
          bump(buildStatus, area.m2Construction > 0 ? "Con construcción" : "Sin construir");
        }
        charts.push({ title: "Estado de construcción", data: toNameCounts(buildStatus) });
      } else {
        const occupancyStatus = new Map<string, number>();
        for (const area of subset) bump(occupancyStatus, area.occupied ? "Ocupada" : "Sin ocupar");
        charts.push({ title: "Ocupación", data: toNameCounts(occupancyStatus) });
      }

      return {
        key,
        title: titles[key].title,
        subtitle: titles[key].subtitle,
        headline: [
          { label: titles[key].title, value: fmt(subset.length) },
          { label: "Ocupados", value: fmt(occupied), hint: subset.length ? `${((occupied / subset.length) * 100).toFixed(1)}% de ocupación` : undefined },
          { label: "Con construcción", value: fmt(built.length) },
          { label: "Superficie construida", value: fmtM2(totalM2) },
          { label: "Con propietario", value: fmt(subset.filter((a) => a.ownerNames.length > 0).length) },
        ],
        charts,
        columns: areaColumns([
          ...(key === "land"
            ? [{ key: "m2Lote", label: "m² lote", numeric: true }]
            : []),
          { key: "m2", label: "m² construcción", numeric: true },
          { key: "estado", label: "Estado" },
          { key: "propietarios", label: "Propietarios", clamp: true },
          ...(key === "commercial" ? [{ key: "negocio", label: "Negocio activo", clamp: true }] : []),
        ]),
        rows: subset.map((area) => ({
          ...areaRow(area),
          ...(key === "land" ? { m2Lote: Math.round(area.m2Land * 100) / 100 } : {}),
          m2: Math.round(area.m2Construction * 100) / 100,
          estado: area.occupied ? "Ocupado" : "Sin ocupar",
          propietarios: area.ownerNames.join(", ") || "—",
          ...(key === "commercial" ? { negocio: area.businessNames.join(", ") || "—" } : {}),
        })),
        tableTitle: titles[key].title,
        notes: [
          ...notes,
          "La clasificación se deriva del uso de suelo registrado en cada inmueble.",
        ],
      };
    }

    case "built": {
      const built = areas.filter((a) => a.m2Construction > 0);
      const totalM2 = built.reduce((sum, a) => sum + a.m2Construction, 0);
      const largest = built.reduce((max, a) => Math.max(max, a.m2Construction), 0);
      const m2ByZone = new Map<string, number>();
      const m2ByCategory = new Map<string, number>();
      const sizeBuckets = new Map<string, number>([
        ["Hasta 100 m²", 0],
        ["101 a 250 m²", 0],
        ["251 a 500 m²", 0],
        ["Más de 500 m²", 0],
      ]);
      for (const area of built) {
        bump(m2ByZone, area.zone, Math.round(area.m2Construction));
        bump(m2ByCategory, area.category, Math.round(area.m2Construction));
        if (area.m2Construction <= 100) bump(sizeBuckets, "Hasta 100 m²");
        else if (area.m2Construction <= 250) bump(sizeBuckets, "101 a 250 m²");
        else if (area.m2Construction <= 500) bump(sizeBuckets, "251 a 500 m²");
        else bump(sizeBuckets, "Más de 500 m²");
      }

      return {
        key,
        title: "Inmuebles con construcción",
        subtitle: "Inmuebles con superficie construida registrada, y su distribución de metros cuadrados.",
        headline: [
          { label: "Con construcción", value: fmt(built.length) },
          { label: "Sin construir", value: fmt(areas.length - built.length) },
          { label: "Superficie total", value: fmtM2(totalM2) },
          { label: "Promedio por inmueble", value: built.length ? fmtM2(totalM2 / built.length) : "0 m²" },
          { label: "Construcción mayor", value: fmtM2(largest) },
        ],
        charts: [
          { title: "Superficie construida por barrio", data: toNameCounts(m2ByZone), suffix: " m²" },
          { title: "Superficie construida por clasificación", data: toNameCounts(m2ByCategory), suffix: " m²" },
          { title: "Distribución por tamaño", data: [...sizeBuckets.entries()].map(([name, value]) => ({ name, value })) },
        ],
        columns: areaColumns([
          { key: "categoria", label: "Clasificación" },
          { key: "m2", label: "m² construcción", numeric: true },
          { key: "estado", label: "Estado" },
          { key: "propietarios", label: "Propietarios", clamp: true },
        ]),
        rows: built
          .slice()
          .sort((a, b) => b.m2Construction - a.m2Construction)
          .map((area) => ({
            ...areaRow(area),
            categoria: area.category,
            m2: Math.round(area.m2Construction * 100) / 100,
            estado: area.occupied ? "Ocupado" : "Sin ocupar",
            propietarios: area.ownerNames.join(", ") || "—",
          })),
        tableTitle: "Inmuebles con construcción",
        notes,
      };
    }
  }
}
