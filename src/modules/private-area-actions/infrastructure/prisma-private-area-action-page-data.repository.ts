import type { PrivateAreaActionPageDataRepository } from "../domain/private-area-action-page-data.repository";
import type {
  PrivateAreaAssignmentLine,
  PrivateAreaActionPageData,
  PrivateAreaCatalogOption,
  PrivateAreaChargeLine,
  PrivateAreaPaymentMethod,
  PrivateAreaPaymentMovement,
} from "../domain/private-area-action-page-data";

import {
  toPrivateAreaStatus,
  toPrivateAreaStatusLabel,
} from "@/shared/domain/private-area-status";
import { prisma } from "@/shared/infrastructure/db/prisma";

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }

  const fallback = Number(value);
  return Number.isNaN(fallback) ? 0 : fallback;
}

function decimalToNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return decimalToNumber(value);
}

function toPaymentMethod(value: string): PrivateAreaPaymentMethod {
  if (
    value === "CASH" ||
    value === "TRANSFER" ||
    value === "CARD" ||
    value === "CHECK" ||
    value === "OTHER"
  ) {
    return value;
  }

  return "OTHER";
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function toUserDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
}): string {
  if (user.businessName && user.businessName.trim().length > 0) {
    return user.businessName.trim();
  }

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName.length > 0 ? fullName : "Sin nombre";
}

function resolveRoleBucket(roleName: string | null): "ACTUAL" | "LEGAL" | "INITIAL" {
  const normalized = normalizeKey(roleName ?? "");

  if (normalized.includes("legal")) {
    return "LEGAL";
  }

  if (
    normalized.includes("moral") ||
    normalized.includes("inicial") ||
    normalized.includes("historia")
  ) {
    return "INITIAL";
  }

  return "ACTUAL";
}

function toCatalogOptions(
  rows: Array<{
    id: string;
    name: string;
    initials: string | null;
  }>,
): PrivateAreaCatalogOption[] {
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      initials: row.initials,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function calculateGeneralMetrics(input: {
  areaM2: number;
  areaIndiviso: number | null;
  m2Original: number | null;
  parentM2ConstructionChildren: number | null;
  projectTotalM2: number | null;
  isChild: boolean;
}): {
  areaM2: number;
  indivisoPercent: number;
  differenceFromOriginalM2: number | null;
} {
  const safeAreaM2 = Number.isFinite(input.areaM2) ? input.areaM2 : 0;

  const denominator = input.isChild
    ? input.parentM2ConstructionChildren
    : input.projectTotalM2;

  const computedIndiviso =
    denominator && denominator > 0
      ? safeAreaM2 / denominator
      : input.areaIndiviso;

  const safeComputedIndiviso =
    computedIndiviso !== null && Number.isFinite(computedIndiviso)
      ? computedIndiviso
      : 0;

  const safeDifference =
    input.m2Original === null
      ? null
      : safeAreaM2 - input.m2Original;

  return {
    areaM2: safeAreaM2,
    indivisoPercent: safeComputedIndiviso,
    differenceFromOriginalM2:
      safeDifference !== null && Number.isFinite(safeDifference)
        ? safeDifference
        : null,
  };
}

function resolveAnnualOrdinaryFee(
  areaCharges: Array<{ amount: unknown; chargeGroup: { name: string } }>,
): number | null {
  if (areaCharges.length === 0) {
    return null;
  }

  const ordinary = areaCharges.find((charge) =>
    charge.chargeGroup.name.toLowerCase().includes("ordinaria"),
  );

  return decimalToNullableNumber((ordinary ?? areaCharges[0]).amount);
}

function toTenantOptions(input: {
  tenantNamesFromUsers: string[];
  rentals: Array<{ tenantName: string | null }>;
  currentTenantName: string | null;
}): string[] {
  const values = new Set<string>();

  const currentTenantName = input.currentTenantName?.trim();
  if (currentTenantName && currentTenantName.length > 0) {
    values.add(currentTenantName);
  }

  for (const tenantNameFromUser of input.tenantNamesFromUsers) {
    const name = tenantNameFromUser.trim();
    if (name.length > 0) {
      values.add(name);
    }
  }

  for (const rental of input.rentals) {
    const tenantName = rental.tenantName?.trim();
    if (tenantName && tenantName.length > 0) {
      values.add(tenantName);
    }
  }

  return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
}

export class PrismaPrivateAreaActionPageDataRepository
  implements PrivateAreaActionPageDataRepository
{
  async getById(privateAreaId: string): Promise<PrivateAreaActionPageData | null> {
    const area = await prisma.privateArea.findFirst({
      where: {
        id: privateAreaId,
      },
      select: {
        id: true,
        condominiumId: true,
        legacyId: true,
        name: true,
        code: true,
        zone: true,
        useType: true,
        status: true,
        isFusion: true,
        isActive: true,
        m2Apole: true,
        m2Original: true,
        m2Construction: true,
        m2CommonArea: true,
        m2ConstructionChildren: true,
        m2CommonAreaChildren: true,
        indiviso: true,
        vccc: true,
        condominium: {
          select: {
            name: true,
          },
        },
        parentPrivateArea: {
          select: {
            name: true,
            legacyId: true,
            m2ConstructionChildren: true,
          },
        },
        areaCharges: {
          where: {
            isActive: true,
          },
          orderBy: {
            startsAt: "desc",
          },
          select: {
            amount: true,
            chargeGroup: {
              select: {
                name: true,
              },
            },
          },
        },
        charges: {
          orderBy: [
            {
              periodYear: "desc",
            },
            {
              periodMonth: "desc",
            },
          ],
          select: {
            id: true,
            periodYear: true,
            periodMonth: true,
            amount: true,
            dueDate: true,
            status: true,
            chargeGroup: {
              select: {
                name: true,
                chargeType: true,
              },
            },
            allocations: {
              select: {
                amount: true,
                payment: {
                  select: {
                    id: true,
                    paidAt: true,
                    method: true,
                    reference: true,
                    notes: true,
                    amount: true,
                  },
                },
              },
            },
          },
        },
        rentals: {
          orderBy: {
            startsAt: "desc",
          },
          select: {
            id: true,
            tenantName: true,
            status: true,
            startsAt: true,
            endsAt: true,
            notes: true,
          },
        },
        childPrivateAreas: {
          select: {
            id: true,
          },
        },
        assignments: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            roleName: true,
            startsAt: true,
            endsAt: true,
            user: {
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
      },
    });

    if (!area) {
      return null;
    }

    const [
      project,
      zoneCatalogs,
      landUseCatalogs,
      users,
      tenantUsers,
    ] = await Promise.all([
      prisma.project.findFirst({
        where: {
          condominiumId: area.condominiumId,
          isActive: true,
        },
        select: {
          id: true,
          totalM2: true,
          commonAreasM2: true,
          hasVccc: true,
        },
      }),
      prisma.zoneCatalog.findMany({
        where: {
          condominiumId: area.condominiumId,
          isActive: true,
        },
        select: {
          id: true,
          legacyId: true,
          name: true,
          initials: true,
        },
      }),
      prisma.landUseCatalog.findMany({
        where: {
          condominiumId: area.condominiumId,
          isActive: true,
        },
        select: {
          id: true,
          legacyId: true,
          name: true,
          initials: true,
        },
      }),
      prisma.user.findMany({
        where: {
          condominiumId: area.condominiumId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          businessName: true,
          email: true,
          phone: true,
        },
      }),
      prisma.user.findMany({
        where: {
          condominiumId: area.condominiumId,
        },
        select: {
          firstName: true,
          lastName: true,
          businessName: true,
        },
      }),
    ]);

    const charges: PrivateAreaChargeLine[] = area.charges.map((charge) => {
      const chargedAmount = decimalToNumber(charge.amount);
      const paidAmount = charge.allocations.reduce((total, allocation) => {
        return total + decimalToNumber(allocation.amount);
      }, 0);

      return {
        id: charge.id,
        periodYear: charge.periodYear,
        periodMonth: charge.periodMonth,
        amount: chargedAmount,
        dueDate: charge.dueDate,
        status: charge.status,
        chargeGroupName: charge.chargeGroup.name,
        chargeGroupType: charge.chargeGroup.chargeType,
        paidAmount,
        balanceAmount: chargedAmount - paidAmount,
      };
    });

    const paymentMovementsById = new Map<string, PrivateAreaPaymentMovement>();

    for (const charge of area.charges) {
      for (const allocation of charge.allocations) {
        const payment = allocation.payment;
        const allocatedAmount = decimalToNumber(allocation.amount);
        const existing = paymentMovementsById.get(payment.id);

        if (existing) {
          existing.allocatedAmount += allocatedAmount;
          continue;
        }

        paymentMovementsById.set(payment.id, {
          paymentId: payment.id,
          paidAt: payment.paidAt,
          method: toPaymentMethod(payment.method),
          reference: payment.reference,
          notes: payment.notes,
          allocatedAmount,
          paymentTotalAmount: decimalToNumber(payment.amount),
        });
      }
    }

    const payments = Array.from(paymentMovementsById.values()).sort((a, b) => {
      return b.paidAt.getTime() - a.paidAt.getTime();
    });

    const assignments: PrivateAreaAssignmentLine[] = area.assignments
      .map((assignment) => ({
        id: assignment.id,
        roleName: assignment.roleName,
        roleBucket: resolveRoleBucket(assignment.roleName),
        startsAt: assignment.startsAt,
        endsAt: assignment.endsAt,
        user: {
          id: assignment.user.id,
          name: toUserDisplayName(assignment.user),
          email: assignment.user.email,
          phone: assignment.user.phone,
        },
      }))
      .sort((a, b) => {
        if (a.roleBucket !== b.roleBucket) {
          return a.roleBucket.localeCompare(b.roleBucket);
        }

        return a.user.name.localeCompare(b.user.name, "es");
      });

    const userOptions = users
      .map((user) => ({
        id: user.id,
        name: toUserDisplayName(user),
        email: user.email,
        phone: user.phone,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));

    const tenantNamesFromUsers = tenantUsers
      .map((user) => toUserDisplayName(user))
      .filter((name) => name.trim().length > 0);

    const currentTenantNameFromRentals =
      area.rentals
        .map((rental) => rental.tenantName?.trim() ?? "")
        .find((tenantName) => tenantName.length > 0) ?? null;

    const currentTenantName = currentTenantNameFromRentals ?? null;

    const m2ApoleRaw = decimalToNullableNumber(area.m2Apole);
    const m2Original = decimalToNullableNumber(area.m2Original);
    const resolvedM2Area =
      m2ApoleRaw !== null && m2ApoleRaw > 0
        ? m2ApoleRaw
        : (m2Original ?? m2ApoleRaw);
    const areaM2 = resolvedM2Area ?? 0;
    const indiviso = decimalToNullableNumber(area.indiviso);
    const parentM2ConstructionChildren = decimalToNullableNumber(
      area.parentPrivateArea?.m2ConstructionChildren,
    );
    const projectTotalM2 = decimalToNullableNumber(project?.totalM2);
    const projectCommonAreasM2 = decimalToNullableNumber(project?.commonAreasM2);
    const isChild = area.parentPrivateArea !== null;

    const m2ConstructionFromDb = decimalToNullableNumber(area.m2Construction);
    const resolvedM2Construction =
      m2ConstructionFromDb ??
      (m2ApoleRaw !== null && m2ApoleRaw <= areaM2 ? m2ApoleRaw : null);

    const m2CommonAreaFromDb = decimalToNullableNumber(area.m2CommonArea);
    const computedCommonAreaFromProject =
      m2Original !== null &&
      projectTotalM2 !== null &&
      projectCommonAreasM2 !== null &&
      projectTotalM2 > 0
        ? (m2Original / projectTotalM2) * projectCommonAreasM2
        : null;
    const resolvedM2CommonArea =
      m2CommonAreaFromDb ?? computedCommonAreaFromProject;

    const generalMetrics = calculateGeneralMetrics({
      areaM2,
      areaIndiviso: indiviso,
      m2Original,
      parentM2ConstructionChildren,
      projectTotalM2,
      isChild,
    });

    const businessStatus = toPrivateAreaStatus(area.status);

    return {
      privateAreaId: area.id,
      name: area.name,
      code: area.code,
      zone: area.zone,
      useType: area.useType,
      businessStatus,
      businessStatusLabel: toPrivateAreaStatusLabel(businessStatus),
      parentName: area.parentPrivateArea?.name ?? null,
      isActive: area.isActive,
      condominiumName: area.condominium.name,
      m2Apole: resolvedM2Area,
      m2Original,
      m2Construction: resolvedM2Construction,
      m2CommonArea: resolvedM2CommonArea,
      m2ConstructionChildren: decimalToNullableNumber(area.m2ConstructionChildren),
      m2CommonAreaChildren: decimalToNullableNumber(area.m2CommonAreaChildren),
      indiviso,
      vccc: decimalToNullableNumber(area.vccc),
      isFusion: area.isFusion,
      isChild,
      hasChildren: area.childPrivateAreas.length > 0,
      projectHasVccc: project?.hasVccc ?? false,
      generalMetrics,
      zones: toCatalogOptions(zoneCatalogs),
      landUses: toCatalogOptions(landUseCatalogs),
      userOptions,
      tenantOptions: toTenantOptions({
        tenantNamesFromUsers,
        rentals: area.rentals,
        currentTenantName,
      }),
      currentTenantName,
      assignments,
      annualOrdinaryFee: resolveAnnualOrdinaryFee(area.areaCharges),
      charges,
      payments,
      rentals: area.rentals,
    };
  }
}
