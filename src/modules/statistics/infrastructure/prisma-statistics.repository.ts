import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";
import type {
  AreaCategory,
  BusinessLineStat,
  KpiDetail,
  KpiKey,
  MonthPoint,
  NameCount,
  StatisticsFilters,
  StatisticsReport,
  StatisticsRepository,
  YearCount,
} from "../domain/statistics";

const OWNER_ROLES = ["Dueño Legal", "Dueño Moral", "Dominio pleno"];
const TENANT_ROLE = "Arrendatario";
const ACTIVE_RENTAL_STATUS = "1";
// Años placeholder del legacy (fecha_inicio 1901/2000) y typos (4200)
const MIN_VALID_YEAR = 2010;

/**
 * Clasifica un uso de suelo de Val'Quirico en categoría habitacional /
 * comercial / lote. Las iniciales van embebidas al final del nombre del
 * catálogo (LF, DP, CA, SS, SD, SX-*, CH, P1, LC, LC2, LB, LB2, CC).
 */
export function classifyUseType(useType: string | null): AreaCategory {
  if (!useType) return "Sin clasificar";
  const normalized = useType.trim();
  if (/\b(LF|DP|CA)\s*$/.test(normalized)) return "Habitacional";
  if (/\b(SS|SD|CH|P1)\s*$/.test(normalized) || /\bSX-?\S*\s*$/.test(normalized)) {
    return "Comercial / Servicios";
  }
  if (/\b(LC2?|LB2?|CC)\s*$/.test(normalized)) return "Lote / Suelo";
  return "Sin clasificar";
}

function toNameCounts(map: Map<string, number>, sortDesc = true): NameCount[] {
  const rows = [...map.entries()].map(([name, value]) => ({ name, value }));
  if (sortDesc) rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return rows;
}

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

class PrismaStatisticsRepository implements StatisticsRepository {
  async getKpiDetail(key: KpiKey, filters: StatisticsFilters): Promise<KpiDetail | null> {
    const condominium = await prisma.condominium.findUnique({
      where: { slug: PROJECT_SCOPE.condominiumCode },
      select: { id: true },
    });
    if (!condominium) return null;
    // Import diferido: kpi-detail.queries importa classifyUseType de este módulo.
    const { loadKpiDetail } = await import("./kpi-detail.queries");
    return loadKpiDetail(condominium.id, key, filters);
  }

  async getReport(filters: StatisticsFilters): Promise<StatisticsReport | null> {
    const condominium = await prisma.condominium.findUnique({
      where: { slug: PROJECT_SCOPE.condominiumCode },
      select: { id: true, name: true },
    });
    if (!condominium) return null;
    const cid = condominium.id;
    const caveats: string[] = [];

    const [areas, assignments, rentals, payments, tickets, announcementAgg, userCounts, debtAreaRows] =
      await Promise.all([
        prisma.privateArea.findMany({
          where: { condominiumId: cid, isActive: true },
          select: {
            id: true,
            zone: true,
            useType: true,
            parentPrivateAreaId: true,
            m2Construction: true,
          },
        }),
        prisma.residentAssignment.findMany({
          where: { condominiumId: cid, isActive: true },
          select: { userId: true, privateAreaId: true, roleName: true },
        }),
        prisma.rental.findMany({
          where: { condominiumId: cid },
          select: { id: true, privateAreaId: true, status: true, startsAt: true },
        }),
        prisma.payment.findMany({
          where: { condominiumId: cid },
          select: { privateAreaId: true, paidAt: true, amount: true, method: true },
        }),
        prisma.ticket.findMany({
          where: { condominiumId: cid, isActive: true },
          select: { privateAreaId: true, status: true },
        }),
        prisma.announcement.aggregate({
          where: { condominiumId: cid, isActive: true },
          _count: true,
          _avg: { attendancePercentage: true },
        }),
        Promise.all([
          prisma.user.count({ where: { condominiumId: cid, isActive: true } }),
          prisma.user.count({
            where: {
              condominiumId: cid,
              isActive: true,
              OR: [{ email: { not: null } }, { personalEmail: { not: null } }],
            },
          }),
          prisma.user.count({
            where: {
              condominiumId: cid,
              isActive: true,
              OR: [{ phone: { not: null } }, { personalPhone: { not: null } }],
            },
          }),
        ]),
        prisma.charge.findMany({
          where: { condominiumId: cid, status: { in: ["OPEN", "PARTIAL"] }, isCollectible: true },
          distinct: ["privateAreaId"],
          select: { privateAreaId: true },
        }),
      ]);

    // Dimensiones disponibles (a partir de la data real)
    const availableZones = [...new Set(areas.map((a) => a.zone).filter((z): z is string => !!z))].sort();
    const availableUseTypes = [...new Set(areas.map((a) => a.useType).filter((u): u is string => !!u))].sort();

    // Conjunto de áreas dentro del filtro
    const filteredAreas = areas.filter(
      (a) => (!filters.zone || a.zone === filters.zone) && (!filters.useType || a.useType === filters.useType),
    );
    const areaIds = new Set(filteredAreas.map((a) => a.id));
    const zoneByAreaId = new Map(areas.map((a) => [a.id, a.zone] as const));

    // ---- Inmuebles ----
    const byZone = new Map<string, number>();
    const byUseType = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const matrixByZone = new Map<string, Map<string, number>>();
    const builtM2ByZone = new Map<string, number>();
    let parents = 0;
    let built = 0;
    let totalBuiltM2 = 0;
    for (const area of filteredAreas) {
      const zoneName = area.zone ?? "Sin barrio";
      const category = classifyUseType(area.useType);
      bump(byZone, zoneName);
      bump(byUseType, area.useType ?? "Sin uso asignado");
      bump(byCategory, category);
      if (!matrixByZone.has(zoneName)) matrixByZone.set(zoneName, new Map());
      bump(matrixByZone.get(zoneName)!, category);
      if (!area.parentPrivateAreaId) parents += 1;
      const m2 = area.m2Construction ? Number(area.m2Construction) : 0;
      if (m2 > 0) {
        built += 1;
        totalBuiltM2 += m2;
        bump(builtM2ByZone, zoneName, Math.round(m2));
      }
    }
    const categoryOrder = ["Habitacional", "Comercial / Servicios", "Lote / Suelo", "Sin clasificar"].filter(
      (name) => (byCategory.get(name) ?? 0) > 0,
    );

    // ---- Propietarios y ocupación ----
    const filteredAssignments = assignments.filter((a) => areaIds.has(a.privateAreaId));
    const ownershipByRole = new Map<string, number>();
    const areasPerOwner = new Map<string, Set<string>>();
    const occupiedAreaIds = new Set<string>();
    const tenantUserIds = new Set<string>();
    for (const assignment of filteredAssignments) {
      const role = assignment.roleName ?? "Sin rol";
      bump(ownershipByRole, role);
      occupiedAreaIds.add(assignment.privateAreaId);
      if (OWNER_ROLES.includes(role)) {
        if (!areasPerOwner.has(assignment.userId)) areasPerOwner.set(assignment.userId, new Set());
        areasPerOwner.get(assignment.userId)!.add(assignment.privateAreaId);
      }
      if (role === TENANT_ROLE) tenantUserIds.add(assignment.userId);
    }
    const totalOwners = areasPerOwner.size;
    let ownersWithMultipleAreas = 0;
    const ownerBuckets = new Map<string, number>([
      ["1 inmueble", 0],
      ["2 a 5 inmuebles", 0],
      ["6 o más inmuebles", 0],
    ]);
    for (const owned of areasPerOwner.values()) {
      if (owned.size > 1) ownersWithMultipleAreas += 1;
      if (owned.size === 1) bump(ownerBuckets, "1 inmueble");
      else if (owned.size <= 5) bump(ownerBuckets, "2 a 5 inmuebles");
      else bump(ownerBuckets, "6 o más inmuebles");
    }

    // ---- Negocios ----
    const filteredRentals = rentals.filter((r) => areaIds.has(r.privateAreaId));
    const activeRentals = filteredRentals.filter((r) => r.status === ACTIVE_RENTAL_STATUS);
    const areasWithActiveBusiness = new Set(activeRentals.map((r) => r.privateAreaId));
    for (const id of areasWithActiveBusiness) occupiedAreaIds.add(id);

    const businessesByZone = new Map<string, number>();
    for (const rental of activeRentals) {
      bump(businessesByZone, zoneByAreaId.get(rental.privateAreaId) ?? "Sin barrio");
    }

    const openingsByYear = new Map<number, number>();
    const currentYear = new Date().getFullYear();
    let placeholderYears = 0;
    for (const rental of filteredRentals) {
      if (!rental.startsAt) continue;
      const year = rental.startsAt.getFullYear();
      if (year < MIN_VALID_YEAR || year > currentYear + 1) {
        placeholderYears += 1;
        continue;
      }
      openingsByYear.set(year, (openingsByYear.get(year) ?? 0) + 1);
    }
    if (placeholderYears > 0) {
      caveats.push(
        `${placeholderYears} negocios tienen fecha de inicio placeholder del sistema anterior (año 1901/2000) y se excluyen de la serie de aperturas.`,
      );
    }
    const businessOpeningsByYear: YearCount[] = [...openingsByYear.entries()]
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year);

    // ---- Giros (solo tras ejecutar la migración/backfill de giros) ----
    let businessesByLine: BusinessLineStat[] | null = null;
    let businessesByCategoryTop: NameCount[] | null = null;
    let businessesByClass: NameCount[] | null = null;
    let classifiedBusinesses: number | null = null;
    let businessLinesCount: number | null = null;
    try {
      // Sonda de existencia: evita invocar el cliente (y su log de error) cuando
      // la migración 'business_lines_catalogs' aún no se aplica en esta BD.
      const [probe] = await prisma.$queryRaw<{ exists: string | null }[]>`
        SELECT to_regclass('public."RentalBusinessLine"')::text AS exists`;
      if (!probe?.exists) {
        throw new Error("business-lines-tables-missing");
      }
      const [lines, classGroups, catalogCount] = await Promise.all([
        prisma.rentalBusinessLine.findMany({
          where: { condominiumId: cid },
          select: {
            rentalId: true,
            businessLine: { select: { name: true } },
            category: { select: { name: true } },
          },
        }),
        prisma.rental.groupBy({
          by: ["businessClass"],
          where: { condominiumId: cid, status: ACTIVE_RENTAL_STATUS },
          _count: true,
        }),
        prisma.businessLineCatalog.count({ where: { condominiumId: cid, isActive: true } }),
      ]);

      const activeRentalIds = new Set(activeRentals.map((r) => r.id));
      const relevantLines = lines.filter((line) => activeRentalIds.has(line.rentalId));
      // Un negocio puede repetir giro en varios slots; contar negocios únicos por giro
      const rentalsPerLine = new Map<string, Set<string>>();
      const rentalsPerCategory = new Map<string, Set<string>>();
      const classifiedRentalIds = new Set<string>();
      for (const line of relevantLines) {
        classifiedRentalIds.add(line.rentalId);
        const lineName = line.businessLine.name;
        if (!rentalsPerLine.has(lineName)) rentalsPerLine.set(lineName, new Set());
        rentalsPerLine.get(lineName)!.add(line.rentalId);
        if (line.category) {
          const categoryName = line.category.name;
          if (!rentalsPerCategory.has(categoryName)) rentalsPerCategory.set(categoryName, new Set());
          rentalsPerCategory.get(categoryName)!.add(line.rentalId);
        }
      }
      classifiedBusinesses = classifiedRentalIds.size;
      businessLinesCount = catalogCount;
      businessesByLine = [...rentalsPerLine.entries()]
        .map(([name, rentalIds]) => ({
          name,
          businesses: rentalIds.size,
          share: classifiedRentalIds.size > 0 ? (rentalIds.size / classifiedRentalIds.size) * 100 : 0,
        }))
        .sort((a, b) => b.businesses - a.businesses || a.name.localeCompare(b.name));
      businessesByCategoryTop = [...rentalsPerCategory.entries()]
        .map(([name, rentalIds]) => ({ name, value: rentalIds.size }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
        .slice(0, 10);
      businessesByClass = classGroups
        .filter((group) => group.businessClass)
        .map((group) => ({ name: `Clase ${group.businessClass}`, value: group._count }))
        .sort((a, b) => b.value - a.value);
      const unclassified = activeRentals.length - classifiedRentalIds.size;
      if (unclassified > 0) {
        caveats.push(`${unclassified} negocios activos aún no tienen giro asignado.`);
      }
    } catch {
      // Tablas de giros aún no existen en la BD (migración pendiente)
      caveats.push(
        "El catálogo de giros comerciales aún no está migrado: ejecuta la migración 'business_lines_catalogs' y el script migration:backfill-business-lines.",
      );
    }

    // ---- Pagos ----
    // Sin filtros activos se incluyen pagos sin área; con filtros, solo los ligados a áreas del filtro
    const filterActive = Boolean(filters.zone || filters.useType);
    const filteredPayments = payments.filter((p) =>
      filterActive ? p.privateAreaId !== null && areaIds.has(p.privateAreaId) : true,
    );
    const monthMap = new Map<string, { count: number; amount: number }>();
    const now = new Date();
    for (let i = 23; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, { count: 0, amount: 0 });
    }
    const paymentsByMethod = new Map<string, number>();
    for (const payment of filteredPayments) {
      const year = payment.paidAt.getFullYear();
      if (year >= MIN_VALID_YEAR && year <= now.getFullYear() + 1) {
        const key = `${year}-${String(payment.paidAt.getMonth() + 1).padStart(2, "0")}`;
        const bucket = monthMap.get(key);
        if (bucket) {
          bucket.count += 1;
          bucket.amount += Number(payment.amount);
        }
      }
      bump(paymentsByMethod, payment.method);
    }
    const paymentsByMonth: MonthPoint[] = [...monthMap.entries()].map(([month, data]) => ({
      month,
      count: data.count,
      amount: Math.round(data.amount * 100) / 100,
    }));

    // ---- Cartera / tickets ----
    const areasWithDebt = debtAreaRows.filter((row) => areaIds.has(row.privateAreaId)).length;
    const filteredTickets = tickets.filter((t) =>
      filterActive ? t.privateAreaId !== null && areaIds.has(t.privateAreaId) : true,
    );
    const ticketsByStatus = new Map<string, number>();
    const ticketStatusLabels: Record<string, string> = {
      OPEN: "Abiertos",
      IN_PROGRESS: "En proceso",
      RESOLVED: "Resueltos",
      CLOSED: "Cerrados",
    };
    for (const ticket of filteredTickets) {
      bump(ticketsByStatus, ticketStatusLabels[ticket.status] ?? ticket.status);
    }

    const occupied = [...occupiedAreaIds].filter((id) => areaIds.has(id)).length;
    const totalFiltered = filteredAreas.length;

    // Ocupación desglosada por barrio (para la barra apilada)
    const occupancyByZone = [...byZone.entries()]
      .map(([zone]) => {
        const zoneAreas = filteredAreas.filter((a) => (a.zone ?? "Sin barrio") === zone);
        const zoneOccupied = zoneAreas.filter((a) => occupiedAreaIds.has(a.id)).length;
        return {
          zone,
          occupied: zoneOccupied,
          vacant: zoneAreas.length - zoneOccupied,
          total: zoneAreas.length,
          rate: zoneAreas.length ? (zoneOccupied / zoneAreas.length) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    caveats.push(
      "Ocupación estimada: un inmueble cuenta como ocupado si tiene residente asignado o negocio activo (el estatus del área no se mantiene al día).",
      "Los montos de cartera vencida se omiten: los saldos migrados del sistema anterior están en revisión.",
    );

    const methodLabels: Record<string, string> = {
      CASH: "Efectivo",
      TRANSFER: "Transferencia",
      CARD: "Tarjeta",
      CHECK: "Cheque",
      OTHER: "Otro",
    };

    return {
      generatedAt: new Date(),
      condominiumName: condominium.name,
      filters,
      availableZones,
      availableUseTypes,

      totalPrivateAreas: totalFiltered,
      parentPrivateAreas: parents,
      childPrivateAreas: totalFiltered - parents,
      residentialAreas: byCategory.get("Habitacional") ?? 0,
      commercialAreas: byCategory.get("Comercial / Servicios") ?? 0,
      landAreas: byCategory.get("Lote / Suelo") ?? 0,
      unclassifiedAreas: byCategory.get("Sin clasificar") ?? 0,
      builtAreas: built,
      unbuiltAreas: totalFiltered - built,
      occupancy: {
        occupied,
        unoccupied: totalFiltered - occupied,
        rate: totalFiltered > 0 ? (occupied / totalFiltered) * 100 : 0,
      },

      totalOwners,
      ownersWithMultipleAreas,
      ownersByAreaCount: [...ownerBuckets.entries()].map(([name, value]) => ({ name, value })),
      ownershipByRole: toNameCounts(ownershipByRole),
      tenantsCount: tenantUserIds.size,

      totalBusinesses: filteredRentals.length,
      activeBusinesses: activeRentals.length,
      areasWithActiveBusiness: areasWithActiveBusiness.size,
      businessesByLine,
      businessesByCategoryTop,
      businessesByClass,
      classifiedBusinesses,
      businessLinesCount,
      businessesByZone: toNameCounts(businessesByZone),
      businessOpeningsByYear,

      areasByZone: toNameCounts(byZone),
      areasByUseType: toNameCounts(byUseType),
      areasByUseTypeCategorized: toNameCounts(byUseType).map((row) => ({
        ...row,
        category: row.name === "Sin uso asignado" ? "Sin clasificar" : classifyUseType(row.name),
      })),
      areasByCategory: toNameCounts(byCategory),
      zoneCategoryMatrix: [...matrixByZone.entries()]
        .map(([zone, counts]) => ({
          zone,
          total: [...counts.values()].reduce((sum, value) => sum + value, 0),
          counts: Object.fromEntries(counts),
        }))
        .sort((a, b) => b.total - a.total),
      categoryOrder,
      occupancyByZone,
      builtM2ByZone: toNameCounts(builtM2ByZone),
      totalBuiltM2: Math.round(totalBuiltM2),

      paymentsByMonth,
      paymentsByMethod: toNameCounts(paymentsByMethod).map((row) => ({
        ...row,
        name: methodLabels[row.name] ?? row.name,
      })),
      areasWithDebt,
      ticketsByStatus: toNameCounts(ticketsByStatus),
      totalTickets: filteredTickets.length,
      attendance: {
        totalAnnouncements: announcementAgg._count,
        averageAttendancePct:
          announcementAgg._count > 0 && announcementAgg._avg.attendancePercentage !== null
            ? Number(announcementAgg._avg.attendancePercentage)
            : null,
      },
      contactCoverage: {
        totalActiveUsers: userCounts[0],
        withEmail: userCounts[1],
        withPhone: userCounts[2],
      },

      caveats,
    };
  }
}

export const prismaStatisticsRepository = new PrismaStatisticsRepository();
