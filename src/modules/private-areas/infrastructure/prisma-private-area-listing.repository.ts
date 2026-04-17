import type { Prisma } from "@prisma/client";

import { PROJECT_SCOPE } from "@/config/project-scope";
import {
  CHARGE_GROUP_KIND,
  type ChargeGroupKind,
  resolveChargeGroupKind,
} from "@/shared/domain/charge-group-kind";
import {
  isOperationalPrivateAreaStatus,
  isVisibleChildPrivateAreaStatus,
  toPrivateAreaStatus,
  toPrivateAreaStatusLabel,
  type PrivateAreaStatus,
} from "@/shared/domain/private-area-status";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  PrivateAreaFacetOption,
  PrivateAreaFinancialCellKey,
  PrivateAreaFinancialSplit,
  PrivateAreaListRow,
  PrivateAreaListing,
  PrivateAreaListingFilters,
} from "../domain/private-area-listing";
import type { PrivateAreaListingRepository } from "../domain/private-area-listing.repository";

type ProjectSnapshot = {
  id: string;
  name: string;
  totalApoles: number | null;
  totalM2: Prisma.Decimal | number | null;
  commonAreasM2: Prisma.Decimal | number | null;
};

type LandUseCatalogSnapshot = {
  legacyId: number | null;
  name: string;
  initials: string | null;
};

type PrivateAreaSnapshot = {
  id: string;
  legacyId: number | null;
  parentPrivateAreaId: string | null;
  sortOrder: number;
  name: string;
  code: string | null;
  zone: string | null;
  useType: string | null;
  status: PrivateAreaStatus;
  isFusion: boolean;
  isActive: boolean;
  m2Original: Prisma.Decimal | number | null;
  m2Apole: Prisma.Decimal | number | null;
  m2Construction: Prisma.Decimal | number | null;
  m2CommonArea: Prisma.Decimal | number | null;
  m2ConstructionChildren: Prisma.Decimal | number | null;
  m2CommonAreaChildren: Prisma.Decimal | number | null;
  indiviso: Prisma.Decimal | number | null;
  vccc: Prisma.Decimal | number | null;
  updatedAt: Date;
  parentPrivateArea: {
    id: string;
    name: string;
    legacyId: number | null;
  } | null;
  childPrivateAreas: Array<{
    id: string;
  }>;
  rentals: Array<{
    startsAt: Date | null;
    endsAt: Date | null;
    status: string | null;
    tenantName: string | null;
    administrativeContactUser: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      businessName: string | null;
      email: string | null;
      phone: string | null;
    } | null;
    operativeContactUser: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      businessName: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  }>;
  assignments: Array<{
    isActive: boolean;
    roleName: string | null;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      businessName: string | null;
      email: string | null;
      phone: string | null;
      userRoles: Array<{
        role: {
          legacyId: number | null;
          name: string;
        };
      }>;
    };
  }>;
  areaCharges: Array<{
    amount: Prisma.Decimal | number;
    chargeGroup: {
      name: string;
      isActive: boolean;
    };
  }>;
  charges: Array<{
    amount: Prisma.Decimal | number;
    paidAmount: Prisma.Decimal | number;
    interestAmount: Prisma.Decimal | number;
    discountAmount: Prisma.Decimal | number;
    isCollectible: boolean;
    periodYear: number;
    periodMonth: number;
    responsibility: "OWNER" | "COMMERCE";
    chargeGroup: {
      name: string;
      chargeType: string | null;
    };
  }>;
};

type PartyContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type ResolvedUseType = {
  label: string;
  initials: string;
  legacyId: number | null;
};

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeLabel(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed;
}


function sanitizeAreaIdentifier(value: string): string {
  return value
    .trim()
    .replace(/^ap\s*:\s*/i, "")
    .replace(/^ap\s+/i, "")
    .replace(/^fap\s*:\s*/i, "")
    .replace(/^fap\s+/i, "")
    .replace(/\s+/g, " ");
}

function toAreaIdentifier(value: string): string {
  return normalizeKey(sanitizeAreaIdentifier(value));
}

function extractFusionAggregateMemberIdentifiers(name: string): string[] {
  const sanitized = sanitizeAreaIdentifier(name);
  if (!sanitized.includes("/")) {
    return [];
  }

  const rawParts = sanitized
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (rawParts.length < 2) {
    return [];
  }

  const firstPart = rawParts[0];
  const prefix = firstPart.match(/^[^0-9]*/)?.[0] ?? "";
  const members = rawParts.map((part, index) => {
    if (index === 0) {
      return toAreaIdentifier(part);
    }

    if (/^[0-9]/.test(part) && prefix.length > 0) {
      return toAreaIdentifier(`${prefix}${part}`);
    }

    return toAreaIdentifier(part);
  });

  return Array.from(new Set(members));
}

function buildUseTypeLookup(
  catalogs: LandUseCatalogSnapshot[],
): Map<string, { label: string; initials: string; legacyId: number | null }> {
  const map = new Map<string, { label: string; initials: string; legacyId: number | null }>();

  for (const catalog of catalogs) {
    const label = normalizeLabel(catalog.name, "Sin uso de suelo");
    const initials = normalizeLabel(catalog.initials, label).toUpperCase();

    map.set(normalizeKey(label), { label, initials, legacyId: catalog.legacyId ?? null });
    map.set(normalizeKey(initials), { label, initials, legacyId: catalog.legacyId ?? null });
  }

  return map;
}

function inferInitials(rawUseType: string): string {
  const compact = rawUseType.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "N/A";
  }

  if (/^[A-Za-z0-9-]{1,8}$/.test(compact)) {
    return compact.toUpperCase();
  }

  const fromWords = compact
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();

  return fromWords || "N/A";
}

function resolveUseType(
  rawUseType: string | null | undefined,
  lookup: Map<string, { label: string; initials: string; legacyId: number | null }>,
): ResolvedUseType {
  const label = normalizeLabel(rawUseType, "Sin uso de suelo");
  const match = lookup.get(normalizeKey(label));

  if (match) {
    return {
      label: match.label,
      initials: match.initials,
      legacyId: match.legacyId,
    };
  }

  return {
    label,
    initials: inferInitials(label),
    legacyId: null,
  };
}

function isAvailableUseType(initials: string): boolean {
  const normalized = initials.toUpperCase();
  const availableSet = new Set(["LB", "LB2", "LC", "LC2", "CC", "LT"]);
  return availableSet.has(normalized);
}

function hasActiveRental(
  rentals: Array<{ startsAt: Date | null; endsAt: Date | null; status: string | null }>,
): boolean {
  return rentals.some((rental) => isRentalCurrentlyActive(rental));
}

function isRentalCurrentlyActive(
  rental: { startsAt: Date | null; endsAt: Date | null; status: string | null },
): boolean {
  const status = (rental.status ?? "").trim().toLowerCase();

  // Legacy query filters rentals by id_cat_status_comercios IN (1,2,3,4).
  return status === "1" || status === "2" || status === "3" || status === "4";
}

function normalizeTenantName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function toUserName(user: {
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
}): string {
  if (user.businessName && user.businessName.trim()) {
    return user.businessName.trim();
  }

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || "Sin nombre";
}

function addContactIfMissing(target: PartyContact[], candidate: PartyContact): void {
  if (target.some((item) => item.id === candidate.id)) {
    return;
  }

  target.push(candidate);
}

function assignmentMatchesRole(
  assignment: PrivateAreaSnapshot["assignments"][number],
  roleKeyword: "legal" | "inicial" | "actual",
): boolean {
  const roleName = normalizeKey(assignment.roleName ?? "");

  if (roleKeyword === "legal") {
    return roleName.includes("legal");
  }

  if (roleKeyword === "inicial") {
    return roleName.includes("moral") || roleName.includes("inicial") || roleName.includes("historia");
  }

  return roleName.includes("dominiopleno") || (roleName.includes("dominio") && roleName.includes("pleno"));
}

function toPartyContactFromAssignment(assignment: PrivateAreaSnapshot["assignments"][number]): PartyContact {
  return {
    id: assignment.user.id,
    name: toUserName(assignment.user),
    email: assignment.user.email,
    phone: assignment.user.phone,
  };
}

function toPartyContactFromUser(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  email: string | null;
  phone: string | null;
}): PartyContact {
  return {
    id: user.id,
    name: toUserName(user),
    email: user.email,
    phone: user.phone,
  };
}

function toPublicPartyContact(contact: PartyContact): Omit<PartyContact, "id"> {
  return {
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
  };
}

function emptyFinancialSplit(): PrivateAreaFinancialSplit {
  return { owner: 0, commerce: 0 };
}

function toPendingAmount(charge: PrivateAreaSnapshot["charges"][number]): number {
  const amount = decimalToNumber(charge.amount);
  const paidAmount = decimalToNumber(charge.paidAmount);
  const interestAmount = decimalToNumber(charge.interestAmount);
  const discountAmount = decimalToNumber(charge.discountAmount);
  return Math.max(0, amount - paidAmount - discountAmount + interestAmount);
}

function addToFinancialSplit(
  split: PrivateAreaFinancialSplit,
  responsibility: "OWNER" | "COMMERCE",
  value: number,
): void {
  if (responsibility === "COMMERCE") {
    split.commerce += value;
    return;
  }

  split.owner += value;
}

function isChargeGroup(
  charge: PrivateAreaSnapshot["charges"][number],
  expectedKind: ChargeGroupKind,
): boolean {
  return resolveChargeGroupKind(charge.chargeGroup) === expectedKind;
}

function splitCharges(
  charges: PrivateAreaSnapshot["charges"],
  predicate: (charge: PrivateAreaSnapshot["charges"][number]) => boolean,
  amountSelector: (charge: PrivateAreaSnapshot["charges"][number]) => number,
): PrivateAreaFinancialSplit {
  const split = emptyFinancialSplit();

  for (const charge of charges) {
    if (!predicate(charge)) {
      continue;
    }

    addToFinancialSplit(split, charge.responsibility, amountSelector(charge));
  }

  return split;
}

function withMonthlyKey(year: number, month: number): PrivateAreaFinancialCellKey {
  return `month_${year}_${String(month).padStart(2, "0")}` as PrivateAreaFinancialCellKey;
}

function buildFinancialCells(
  charges: PrivateAreaSnapshot["charges"],
  currentOrdinaryYear: number,
): Partial<Record<PrivateAreaFinancialCellKey, PrivateAreaFinancialSplit>> {
  const nextOrdinaryYear = currentOrdinaryYear + 1;
  const previousOrdinaryYear = currentOrdinaryYear - 1;

  const ordinaryCurrentAnnual = splitCharges(
    charges,
    (charge) =>
      isChargeGroup(charge, CHARGE_GROUP_KIND.ORDINARY) &&
      charge.periodYear === currentOrdinaryYear,
    (charge) => decimalToNumber(charge.amount),
  );

  const ordinaryCurrentOutstanding = splitCharges(
    charges,
    (charge) =>
      charge.isCollectible &&
      isChargeGroup(charge, CHARGE_GROUP_KIND.ORDINARY) &&
      charge.periodYear === currentOrdinaryYear,
    (charge) => toPendingAmount(charge),
  );

  const ordinaryNextAnnual = splitCharges(
    charges,
    (charge) =>
      isChargeGroup(charge, CHARGE_GROUP_KIND.ORDINARY) &&
      charge.periodYear === nextOrdinaryYear,
    (charge) => decimalToNumber(charge.amount),
  );

  const ordinaryNextOutstanding = splitCharges(
    charges,
    (charge) =>
      charge.isCollectible &&
      isChargeGroup(charge, CHARGE_GROUP_KIND.ORDINARY) &&
      charge.periodYear === nextOrdinaryYear,
    (charge) => toPendingAmount(charge),
  );

  const totalOutstanding = splitCharges(
    charges,
    (charge) => charge.isCollectible,
    (charge) => toPendingAmount(charge),
  );

  const cells: Partial<Record<PrivateAreaFinancialCellKey, PrivateAreaFinancialSplit>> = {
    arrears_2017_2024: splitCharges(
      charges,
      (charge) =>
        charge.isCollectible &&
        isChargeGroup(charge, CHARGE_GROUP_KIND.ORDINARY) &&
        charge.periodYear <= previousOrdinaryYear,
      (charge) => toPendingAmount(charge),
    ),
    advance_2024: splitCharges(
      charges,
      (charge) =>
        isChargeGroup(charge, CHARGE_GROUP_KIND.ORDINARY) &&
        charge.periodYear === previousOrdinaryYear,
      (charge) => decimalToNumber(charge.paidAmount),
    ),
    ordinary_2025_annual: ordinaryCurrentAnnual,
    ordinary_2025_monthly: {
      owner: ordinaryCurrentAnnual.owner / 12,
      commerce: ordinaryCurrentAnnual.commerce / 12,
    },
    ordinary_2025_outstanding: ordinaryCurrentOutstanding,
    ordinary_2026_annual: ordinaryNextAnnual,
    ordinary_2026_monthly: {
      owner: ordinaryNextAnnual.owner / 12,
      commerce: ordinaryNextAnnual.commerce / 12,
    },
    ordinary_2026_outstanding: ordinaryNextOutstanding,
    extra_condo_2024_2025: splitCharges(
      charges,
      (charge) =>
        isChargeGroup(charge, CHARGE_GROUP_KIND.EXTRA_CONDO) &&
        charge.periodYear >= previousOrdinaryYear &&
        charge.periodYear <= currentOrdinaryYear,
      (charge) => decimalToNumber(charge.amount),
    ),
    extra_condo_2024_2025_outstanding: splitCharges(
      charges,
      (charge) =>
        charge.isCollectible &&
        isChargeGroup(charge, CHARGE_GROUP_KIND.EXTRA_CONDO) &&
        charge.periodYear >= previousOrdinaryYear &&
        charge.periodYear <= currentOrdinaryYear,
      (charge) => toPendingAmount(charge),
    ),
    extra_commerce_2024_2025: splitCharges(
      charges,
      (charge) =>
        isChargeGroup(charge, CHARGE_GROUP_KIND.EXTRA_COMMERCE) &&
        charge.periodYear >= previousOrdinaryYear &&
        charge.periodYear <= currentOrdinaryYear,
      (charge) => decimalToNumber(charge.amount),
    ),
    extra_commerce_2024_2025_outstanding: splitCharges(
      charges,
      (charge) =>
        charge.isCollectible &&
        isChargeGroup(charge, CHARGE_GROUP_KIND.EXTRA_COMMERCE) &&
        charge.periodYear >= previousOrdinaryYear &&
        charge.periodYear <= currentOrdinaryYear,
      (charge) => toPendingAmount(charge),
    ),
    stc: splitCharges(
      charges,
      (charge) => isChargeGroup(charge, CHARGE_GROUP_KIND.STC),
      (charge) => decimalToNumber(charge.amount),
    ),
    stc_outstanding: splitCharges(
      charges,
      (charge) => charge.isCollectible && isChargeGroup(charge, CHARGE_GROUP_KIND.STC),
      (charge) => toPendingAmount(charge),
    ),
    sancion: splitCharges(
      charges,
      (charge) => isChargeGroup(charge, CHARGE_GROUP_KIND.SANCTION),
      (charge) => decimalToNumber(charge.amount),
    ),
    sancion_outstanding: splitCharges(
      charges,
      (charge) =>
        charge.isCollectible &&
        isChargeGroup(charge, CHARGE_GROUP_KIND.SANCTION),
      (charge) => toPendingAmount(charge),
    ),
    comodato: splitCharges(
      charges,
      (charge) => isChargeGroup(charge, CHARGE_GROUP_KIND.COMODATO),
      (charge) => decimalToNumber(charge.amount),
    ),
    comodato_outstanding: splitCharges(
      charges,
      (charge) =>
        charge.isCollectible &&
        isChargeGroup(charge, CHARGE_GROUP_KIND.COMODATO),
      (charge) => toPendingAmount(charge),
    ),
    total_outstanding: totalOutstanding,
  };

  for (const year of [currentOrdinaryYear, nextOrdinaryYear]) {
    for (let month = 1; month <= 12; month += 1) {
      cells[withMonthlyKey(year, month)] = splitCharges(
        charges,
        (charge) =>
          charge.isCollectible &&
          isChargeGroup(charge, CHARGE_GROUP_KIND.ORDINARY) &&
          charge.periodYear === year &&
          charge.periodMonth === month,
        (charge) => toPendingAmount(charge),
      );
    }
  }

  return cells;
}

function toFacetOptions(rows: PrivateAreaListRow[]): PrivateAreaFacetOption[] {
  const map = new Map<string, { label: string; count: number }>();

  for (const row of rows) {
    const key = normalizeKey(row.useType);
    const current = map.get(key);

    if (!current) {
      map.set(key, { label: row.useType, count: 1 });
      continue;
    }

    current.count += 1;
  }

  return Array.from(map.entries())
    .map(([value, payload]) => ({
      value,
      label: payload.label,
      count: payload.count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

function matchesQuery(row: PrivateAreaListRow, query: string): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = normalizeKey(query);
  const normalizedQueryWithoutPrefix = normalizeKey(sanitizeAreaIdentifier(query));
  const candidateQueries = [normalizedQuery, normalizedQueryWithoutPrefix].filter(
    (value, index, values) => value.length > 0 && values.indexOf(value) === index,
  );

  const rowTokens = [
    row.name,
    row.code ?? "",
    row.zone,
    row.useType,
    row.useTypeInitials,
    sanitizeAreaIdentifier(row.name),
  ]
    .map((value) => normalizeKey(value))
    .join(" ");

  return candidateQueries.some((candidate) => rowTokens.includes(candidate));
}

const legacyNameCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

function toLegacySortableName(name: string): string {
  const sanitized = sanitizeAreaIdentifier(name).toUpperCase();
  const firstGroup = sanitized.split("/")[0]?.trim() ?? sanitized;
  return firstGroup;
}

function createLegacyRowSorter(): (a: PrivateAreaListRow, b: PrivateAreaListRow) => number {
  return (a: PrivateAreaListRow, b: PrivateAreaListRow): number => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    const byName = legacyNameCollator.compare(
      toLegacySortableName(a.name),
      toLegacySortableName(b.name),
    );
    if (byName !== 0) {
      return byName;
    }

    return a.id.localeCompare(b.id, "es");
  };
}

function shouldRenderInLegacyTable(row: PrivateAreaListRow): boolean {
  if (!row.isActive) {
    return false;
  }

  if (!row.parentPrivateAreaId) {
    return true;
  }

  return isVisibleChildPrivateAreaStatus(row.businessStatus);
}

function isSassiCondominium(slug: string): boolean {
  return normalizeKey(slug).includes("sassi");
}

export class PrismaPrivateAreaListingRepository implements PrivateAreaListingRepository {
  async getListing(filters: PrivateAreaListingFilters): Promise<PrivateAreaListing | null> {
    const condominium =
      (await prisma.condominium.findFirst({
        where: {
          isActive: true,
          slug: PROJECT_SCOPE.condominiumCode,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          updatedAt: true,
          projects: {
            where: { isActive: true },
            take: 1,
            select: {
              id: true,
              name: true,
              totalApoles: true,
              totalM2: true,
              commonAreasM2: true,
            },
          },
        },
      })) ??
      (await prisma.condominium.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          updatedAt: true,
          projects: {
            where: { isActive: true },
            take: 1,
            select: {
              id: true,
              name: true,
              totalApoles: true,
              totalM2: true,
              commonAreasM2: true,
            },
          },
        },
      }));

    if (!condominium) {
      return null;
    }

    const [
      privateAreas,
      landUseCatalogs,
      maxPrivateAreaUpdate,
    ] = await Promise.all([
      prisma.privateArea.findMany({
        where: { condominiumId: condominium.id },
        select: {
          id: true,
          legacyId: true,
          parentPrivateAreaId: true,
          sortOrder: true,
          name: true,
          code: true,
          zone: true,
          useType: true,
          status: true,
          isFusion: true,
          isActive: true,
          m2Original: true,
          m2Apole: true,
          m2Construction: true,
          m2CommonArea: true,
          m2ConstructionChildren: true,
          m2CommonAreaChildren: true,
          indiviso: true,
          vccc: true,
          updatedAt: true,
          parentPrivateArea: {
            select: {
              id: true,
              name: true,
              legacyId: true,
            },
          },
          childPrivateAreas: {
            select: {
              id: true,
            },
          },
          rentals: {
            orderBy: [
              { startsAt: "asc" },
              { tenantName: "asc" },
            ],
            select: {
              startsAt: true,
              endsAt: true,
              status: true,
              tenantName: true,
              administrativeContactUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  businessName: true,
                  email: true,
                  phone: true,
                },
              },
              operativeContactUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  businessName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          assignments: {
            where: {
              isActive: true,
              user: {
                isActive: true,
              },
            },
            select: {
              isActive: true,
              roleName: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  businessName: true,
                  email: true,
                  phone: true,
                  userRoles: {
                    select: {
                      role: {
                        select: {
                          legacyId: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          areaCharges: {
            where: { isActive: true },
            select: {
              amount: true,
              chargeGroup: {
                select: {
                  name: true,
                  isActive: true,
                },
              },
            },
          },
          charges: {
            select: {
              amount: true,
              paidAmount: true,
              interestAmount: true,
              discountAmount: true,
              isCollectible: true,
              periodYear: true,
              periodMonth: true,
              responsibility: true,
              chargeGroup: {
                select: {
                  name: true,
                  chargeType: true,
                },
              },
            },
          },
        },
      }),
      prisma.landUseCatalog.findMany({
        where: { condominiumId: condominium.id, isActive: true },
        select: {
          legacyId: true,
          name: true,
          initials: true,
        },
      }),
      prisma.privateArea.aggregate({
        where: { condominiumId: condominium.id },
        _max: { updatedAt: true },
      }),
    ]);

    const project = (condominium.projects[0] ?? null) as ProjectSnapshot | null;
    const isSassi = isSassiCondominium(condominium.slug);
    const projectTotalM2 = decimalToNumber(project?.totalM2);
    const projectCommonAreasM2 = decimalToNumber(project?.commonAreasM2);

    const useTypeLookup = buildUseTypeLookup(landUseCatalogs as LandUseCatalogSnapshot[]);
    const currentOrdinaryYear = new Date().getUTCFullYear() - 1;

    const allRows = (privateAreas as PrivateAreaSnapshot[]).map((area) => {
      const resolvedUseType = resolveUseType(area.useType, useTypeLookup);
      const m2Original = decimalToNumber(area.m2Original);
      const m2UpdatedSource = decimalToNumber(area.m2Apole);
      const m2Updated = m2UpdatedSource > 0 ? m2UpdatedSource : m2Original;
      const m2CommonAreaRaw = decimalToNumber(area.m2CommonArea);
      const indivisoRaw = decimalToNumber(area.indiviso);
      const indivisoCalculated =
        projectTotalM2 > 0
          ? (m2Original / projectTotalM2) * 100
          : 0;
      const indiviso = indivisoCalculated > 0 ? indivisoCalculated : indivisoRaw;

      const commonAreaM2 =
        projectCommonAreasM2 > 0 && indiviso > 0
          ? (indiviso / 100) * projectCommonAreasM2
          : m2CommonAreaRaw;

      const financialCells = buildFinancialCells(area.charges, currentOrdinaryYear);
      const ordinaryAnnualCell = financialCells.ordinary_2025_annual ?? emptyFinancialSplit();
      const ordinaryMonthlyCell = financialCells.ordinary_2025_monthly ?? emptyFinancialSplit();
      const outstandingCell = financialCells.total_outstanding ?? emptyFinancialSplit();
      const annualOrdinaryFee = ordinaryAnnualCell.owner + ordinaryAnnualCell.commerce;
      const monthlyOrdinaryFee = ordinaryMonthlyCell.owner + ordinaryMonthlyCell.commerce;
      const outstandingBalance = outstandingCell.owner + outstandingCell.commerce;
      const m2ConstructionRaw = decimalToNumber(area.m2Construction);

      const inferredFusionMembers = extractFusionAggregateMemberIdentifiers(area.name);
      const hierarchyRole: PrivateAreaListRow["hierarchyRole"] =
        area.isFusion || inferredFusionMembers.length > 1
        ? "FUSION"
        : area.parentPrivateAreaId
          ? "CHILD"
          : area.childPrivateAreas.length > 0
            ? "PARENT"
            : "SINGLE";

      const ownerInitialHistory: PartyContact[] = [];
      const ownerLegal: PartyContact[] = [];
      const domainCurrent: PartyContact[] = [];

      for (const assignment of area.assignments) {
        const contact = toPartyContactFromAssignment(assignment);

        if (assignmentMatchesRole(assignment, "inicial")) {
          addContactIfMissing(ownerInitialHistory, contact);
        }

        if (assignmentMatchesRole(assignment, "legal")) {
          addContactIfMissing(ownerLegal, contact);
        }

        if (assignmentMatchesRole(assignment, "actual")) {
          addContactIfMissing(domainCurrent, contact);
        }
      }

      const legalIds = new Set(ownerLegal.map((item) => item.id));
      const domainFull = domainCurrent.filter((item) => !legalIds.has(item.id));
      const resolvedDomainFull = domainFull.length > 0 ? domainFull : domainCurrent;

      const tenantUsers: PartyContact[] = [];
      const rentalAdministrativeContacts: PartyContact[] = [];
      const rentalOperationalContacts: PartyContact[] = [];
      const businessStatus = toPrivateAreaStatus(area.status);

      for (const rental of area.rentals) {
        if (!isRentalCurrentlyActive(rental)) {
          continue;
        }

        const tenantName = normalizeTenantName(rental.tenantName);
        if (tenantName) {
          addContactIfMissing(tenantUsers, {
            id: `tenant:${area.id}:${tenantName}`,
            name: tenantName,
            email: null,
            phone: null,
          });
        }

        if (rental.administrativeContactUser) {
          addContactIfMissing(
            rentalAdministrativeContacts,
            toPartyContactFromUser(rental.administrativeContactUser),
          );
        }

        if (rental.operativeContactUser) {
          addContactIfMissing(
            rentalOperationalContacts,
            toPartyContactFromUser(rental.operativeContactUser),
          );
        }

        // Legacy security listing renders a single tenant row (SQL LIMIT 1).
        break;
      }

      return {
        id: area.id,
        sortOrder: area.sortOrder,
        parentPrivateAreaId: area.parentPrivateAreaId,
        parentName: area.parentPrivateArea ? normalizeLabel(area.parentPrivateArea.name, "Sin padre") : null,
        hierarchyRole,
        name: normalizeLabel(area.name, "Sin nombre"),
        code: area.code,
        zone: normalizeLabel(area.zone, "Sin zona"),
        useType: resolvedUseType.label,
        useTypeInitials: resolvedUseType.initials,
        businessStatus,
        businessStatusLabel: toPrivateAreaStatusLabel(businessStatus),
        isFusionLegacy: area.isFusion,
        isActive: area.isActive,
        hasRental: hasActiveRental(area.rentals),
        m2Updated,
        m2Original,
        m2Construction: m2ConstructionRaw > 0 ? m2ConstructionRaw : m2Updated,
        m2CommonArea: commonAreaM2 > 0 ? commonAreaM2 : m2CommonAreaRaw,
        m2ConstructionChildren: decimalToNumber(area.m2ConstructionChildren),
        m2CommonAreaChildren: decimalToNumber(area.m2CommonAreaChildren),
        indiviso,
        vccc: decimalToNumber(area.vccc),
        commonAreaM2,
        totalAreaM2: (m2ConstructionRaw > 0 ? m2ConstructionRaw : m2Updated) + (commonAreaM2 > 0 ? commonAreaM2 : m2CommonAreaRaw),
        annualOrdinaryFee,
        monthlyOrdinaryFee,
        outstandingBalance,
        financialCells,
        ownerInitialHistory: ownerInitialHistory.map(toPublicPartyContact),
        ownerLegal: ownerLegal.map(toPublicPartyContact),
        domainCurrent: domainCurrent.map(toPublicPartyContact),
        domainFull: resolvedDomainFull.map(toPublicPartyContact),
        tenantUsers: tenantUsers.map(toPublicPartyContact),
        rentalAdministrativeContacts: rentalAdministrativeContacts.map(toPublicPartyContact),
        rentalOperationalContacts: rentalOperationalContacts.map(toPublicPartyContact),
        updatedAt: area.updatedAt,
      } satisfies PrivateAreaListRow;
    });

    const sortRowsLegacyOrder = createLegacyRowSorter();

    const childRowsByParentId = new Map<string, PrivateAreaListRow[]>();

    for (const row of allRows) {
      if (!row.parentPrivateAreaId) {
        continue;
      }

      const rows = childRowsByParentId.get(row.parentPrivateAreaId) ?? [];
      rows.push(row);
      childRowsByParentId.set(row.parentPrivateAreaId, rows);
    }

    for (const row of allRows) {
      const children = childRowsByParentId.get(row.id) ?? [];
      const childrenConstructionM2 = children.reduce((acc, child) => acc + child.m2Construction, 0);
      const childrenCommonAreaM2 = children.reduce((acc, child) => acc + child.m2CommonArea, 0);

      if (row.m2ConstructionChildren <= 0 && childrenConstructionM2 > 0) {
        row.m2ConstructionChildren = childrenConstructionM2;
      }

      if (row.m2CommonAreaChildren <= 0 && childrenCommonAreaM2 > 0) {
        row.m2CommonAreaChildren = childrenCommonAreaM2;
      }
    }

    const orderedRows: PrivateAreaListRow[] = [];
    const visited = new Set<string>();

    const pushWithDescendants = (row: PrivateAreaListRow): void => {
      if (visited.has(row.id)) {
        return;
      }

      visited.add(row.id);
      orderedRows.push(row);

      const childRows = (childRowsByParentId.get(row.id) ?? []).sort(sortRowsLegacyOrder);
      for (const child of childRows) {
        pushWithDescendants(child);
      }
    };

    const topLevelRows = allRows
      .filter((row) => !row.parentPrivateAreaId)
      .sort(sortRowsLegacyOrder);

    for (const row of topLevelRows) {
      pushWithDescendants(row);
    }

    const remainingRows = allRows
      .filter((row) => !visited.has(row.id))
      .sort(sortRowsLegacyOrder);

    for (const row of remainingRows) {
      pushWithDescendants(row);
    }

    const legacyTopLevelLots = orderedRows.filter(
      (row) =>
        row.isActive &&
        !row.parentPrivateAreaId &&
        !row.isFusionLegacy &&
        isOperationalPrivateAreaStatus(row.businessStatus),
    );

    const legacyLots = project?.totalApoles && project.totalApoles > 0
      ? project.totalApoles
      : legacyTopLevelLots.length;
    const legacyLotsM2 = legacyTopLevelLots
      .slice(0, legacyLots)
      .reduce((acc, row) => acc + row.m2Updated, 0);

    const legacyAvailableLots = orderedRows.filter(
      (row) =>
        row.isActive &&
        !row.isFusionLegacy &&
        isOperationalPrivateAreaStatus(row.businessStatus) &&
        (isSassi ? row.useTypeInitials.toUpperCase() === "LT" : isAvailableUseType(row.useTypeInitials)),
    ).length;

    const legacyBuiltLots = isSassi
      ? orderedRows.filter(
          (row) =>
            row.isActive &&
            !row.isFusionLegacy &&
            isOperationalPrivateAreaStatus(row.businessStatus) &&
            row.useTypeInitials.toUpperCase() === "LT-CR",
        ).length
      : Math.max(0, legacyLots - legacyAvailableLots);

    const legacyFractions = orderedRows.filter((row) => {
      if (
        !row.isActive ||
        !isOperationalPrivateAreaStatus(row.businessStatus) ||
        normalizeKey(row.useType) === normalizeKey("Sin uso de suelo")
      ) {
        return false;
      }

      if (!isSassi) {
        return true;
      }

      return Boolean(row.parentPrivateAreaId);
    }).length;

    const legacyFusionLots = orderedRows.filter(
      (row) =>
        row.isActive &&
        row.hierarchyRole === "FUSION" &&
        !row.parentPrivateAreaId &&
        isOperationalPrivateAreaStatus(row.businessStatus) &&
        (childRowsByParentId.get(row.id)?.length ?? 0) > 0,
    ).length;

    const activeRows = orderedRows.filter((row) => row.isActive);
    const availableAreas = activeRows.filter((row) => isAvailableUseType(row.useTypeInitials)).length;
    const builtAreas = Math.max(0, activeRows.length - availableAreas);

    const summary = {
      projectTotalApoles: project?.totalApoles ?? 0,
      projectTotalM2,
      projectCommonAreasM2,
      legacyLots,
      legacyLotsM2,
      legacyAvailableLots,
      legacyBuiltLots,
      legacyFractions,
      legacyFusionLots,
      registeredAreas: orderedRows.length,
      activeAreas: activeRows.length,
      inactiveAreas: orderedRows.length - activeRows.length,
      availableAreas,
      builtAreas,
      availableRatio: activeRows.length > 0 ? (availableAreas / activeRows.length) * 100 : 0,
      builtRatio: activeRows.length > 0 ? (builtAreas / activeRows.length) * 100 : 0,
      areasWithUseType: activeRows.filter((row) => normalizeKey(row.useType) !== normalizeKey("Sin uso de suelo")).length,
      areasWithoutUseType: activeRows.filter((row) => normalizeKey(row.useType) === normalizeKey("Sin uso de suelo")).length,
      totalOriginalM2: orderedRows.reduce((acc, row) => acc + row.m2Original, 0),
      totalUpdatedM2: orderedRows.reduce((acc, row) => acc + row.m2Updated, 0),
      estimatedAnnualOrdinaryIncome: activeRows.reduce((acc, row) => acc + row.annualOrdinaryFee, 0),
      estimatedMonthlyOrdinaryIncome: activeRows.reduce((acc, row) => acc + row.monthlyOrdinaryFee, 0),
      estimatedOutstandingBalance: orderedRows.reduce((acc, row) => acc + row.outstandingBalance, 0),
    };

    const prefilteredRows =
      filters.status === "INACTIVE"
        ? orderedRows
        : orderedRows.filter((row) => shouldRenderInLegacyTable(row));

    const filteredRows = prefilteredRows
      .filter((row) => {
        if (filters.status === "ACTIVE" && !row.isActive) {
          return false;
        }

        if (filters.status === "INACTIVE" && row.isActive) {
          return false;
        }

        return true;
      })
      .filter((row) => {
        if (!filters.useType) {
          return true;
        }

        return normalizeKey(row.useType) === normalizeKey(filters.useType);
      })
      .filter((row) => matchesQuery(row, filters.query))
      .filter((row) => {
        if (filters.m2Min !== null && row.m2Updated < filters.m2Min) {
          return false;
        }

        if (filters.m2Max !== null && row.m2Updated > filters.m2Max) {
          return false;
        }

        return true;
      });

    const paginateByTopLevel = filters.paginateByTopLevel === true;

    let totalRows = filteredRows.length;
    let totalPages = Math.max(1, Math.ceil(totalRows / filters.pageSize));
    let page = Math.min(filters.page, totalPages);
    let pagedRows = filteredRows.slice((page - 1) * filters.pageSize, page * filters.pageSize);

    if (paginateByTopLevel) {
      const rowsByParentId = new Map<string, PrivateAreaListRow[]>();
      for (const row of filteredRows) {
        if (!row.parentPrivateAreaId) {
          continue;
        }

        const bucket = rowsByParentId.get(row.parentPrivateAreaId) ?? [];
        bucket.push(row);
        rowsByParentId.set(row.parentPrivateAreaId, bucket);
      }

      const topLevelRows = filteredRows
        .filter((row) => !row.parentPrivateAreaId)
        .sort(sortRowsLegacyOrder);

      totalRows = topLevelRows.length;
      totalPages = Math.max(1, Math.ceil(totalRows / filters.pageSize));
      page = Math.min(filters.page, totalPages);

      const start = (page - 1) * filters.pageSize;
      const pagedTopLevelRows = topLevelRows.slice(start, start + filters.pageSize);

      const visited = new Set<string>();
      const rowsForCurrentPage: PrivateAreaListRow[] = [];

      const pushWithDescendants = (row: PrivateAreaListRow): void => {
        if (visited.has(row.id)) {
          return;
        }

        visited.add(row.id);
        rowsForCurrentPage.push(row);

        const children = (rowsByParentId.get(row.id) ?? []).sort(sortRowsLegacyOrder);
        for (const child of children) {
          pushWithDescendants(child);
        }
      };

      for (const topLevelRow of pagedTopLevelRows) {
        pushWithDescendants(topLevelRow);
      }

      pagedRows = rowsForCurrentPage;
    }

    const latestUpdatedAt =
      maxPrivateAreaUpdate._max.updatedAt && maxPrivateAreaUpdate._max.updatedAt > condominium.updatedAt
        ? maxPrivateAreaUpdate._max.updatedAt
        : condominium.updatedAt;

    return {
      condominiumName: condominium.name,
      condominiumSlug: condominium.slug,
      projectName: project?.name ?? "Proyecto sin nombre",
      updatedAt: latestUpdatedAt,
      filters: {
        ...filters,
        page,
      },
      facets: {
        useTypes: toFacetOptions(orderedRows),
      },
      summary,
      pagination: {
        page,
        pageSize: filters.pageSize,
        totalRows,
        totalPages,
      },
      rows: pagedRows,
      caveats: [
        "Fase 4 modela jerarquia y estado legacy en PrivateArea; la captura operativa todavia es incremental.",
        "La clasificacion de Soles/Sombras se calcula por iniciales de uso de suelo y reglas operativas modernas.",
        "Cuotas y saldos se calculan desde Charge con responsabilidad OWNER/COMMERCE en el modelo de dominio actual.",
      ],
    };
  }
}
