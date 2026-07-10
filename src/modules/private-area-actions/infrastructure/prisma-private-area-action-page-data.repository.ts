import type { PrivateAreaActionPageDataRepository } from "../domain/private-area-action-page-data.repository";
import type {
  PrivateAreaAssignmentLine,
  PrivateAreaActionPageData,
  PrivateAreaCatalogOption,
  PrivateAreaChargeLine,
  PrivateAreaPaymentMethod,
  PrivateAreaPaymentMovement,
  PrivateAreaRentalLine,
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
    .replace(/[^a-z0-9+]/g, "");
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
        level: true,
        sortOrder: true,
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
        m2ConstructionCommonArea: true,
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
        incomes: {
          where: {
            isActive: true,
          },
          orderBy: {
            date: "desc",
          },
          select: {
            id: true,
            legacyId: true,
            date: true,
            paymentMethod: true,
            concept: true,
            notes: true,
            amount: true,
            chargeGroupId: true,
            chargeGroup: {
              select: {
                name: true,
                chargeType: true,
              },
            },
          },
        },
        charges: {
          where: {
            isCollectible: true,
          },
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
            concept: true,
            chargeGroupId: true,
            interestAmount: true,
            discountAmount: true,
            responsibility: true,
            isCollectible: true,
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
                    legacyId: true,
                    paidAt: true,
                    method: true,
                    reference: true,
                    notes: true,
                    amount: true,
                    isVisibleInFinancialSummary: true,
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

    const inMemoryAllocationsByChargeId = new Map<string, number>();
    const inMemoryAllocationDatesByChargeId = new Map<string, Set<string>>();

    const calculateAllocationsForArea = (charges: any[], incomes: any[]) => {
      const sortedCharges = [...charges].sort((a, b) => {
        if (a.periodYear !== b.periodYear) {
          return a.periodYear - b.periodYear;
        }
        return a.periodMonth - b.periodMonth;
      });

      const sortedIncomes = [...incomes].sort((a, b) => a.date.getTime() - b.date.getTime());

      // Build a set of legacyIds of payments that already have allocations in the database
      const allocatedLegacyIds = new Set<number>();
      for (const charge of charges) {
        for (const alloc of charge.allocations) {
          if (alloc.payment.legacyId !== null) {
            allocatedLegacyIds.add(alloc.payment.legacyId);
          }
        }
      }

      for (const income of sortedIncomes) {
        if (income.legacyId !== null && allocatedLegacyIds.has(income.legacyId)) {
          // This income is already represented as a Payment with allocations in the database.
          // Skip simulating it in memory to prevent double-allocation!
          continue;
        }

        const chargeGroupId = income.chargeGroupId;
        if (!chargeGroupId) continue;

        let remainingIncome = decimalToNumber(income.amount);
        const groupCharges = sortedCharges.filter((c) => c.chargeGroupId === chargeGroupId);

        for (const charge of groupCharges) {
          if (remainingIncome <= 0.005) break;

          const dbPaid = charge.allocations.reduce(
            (sum: number, alloc: any) => sum + decimalToNumber(alloc.amount),
            0,
          );
          const prevAllocated = inMemoryAllocationsByChargeId.get(charge.id) ?? 0;
          const currentPaid = dbPaid + prevAllocated;

          const chargedAmount = decimalToNumber(charge.amount);
          const interest = decimalToNumber(charge.interestAmount);
          const discount = decimalToNumber(charge.discountAmount);
          const balance = chargedAmount - currentPaid + interest - discount;

          if (balance > 0.005) {
            const allocate = Math.min(remainingIncome, balance);
            inMemoryAllocationsByChargeId.set(charge.id, prevAllocated + allocate);
            remainingIncome -= allocate;

            if (!inMemoryAllocationDatesByChargeId.has(charge.id)) {
              inMemoryAllocationDatesByChargeId.set(charge.id, new Set<string>());
            }
            const date = income.date;
            const day = date.getDate().toString().padStart(2, "0");
            const monthNames = [
              "ene", "feb", "mar", "abr", "may", "jun",
              "jul", "ago", "sep", "oct", "nov", "dic"
            ];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            inMemoryAllocationDatesByChargeId.get(charge.id)!.add(`${day} ${month} ${year}`);
          }
        }
      }
    };

    calculateAllocationsForArea(area.charges, area.incomes);

    const charges: PrivateAreaChargeLine[] = area.charges.map((charge) => {
      const chargedAmount = decimalToNumber(charge.amount);
      const dbPaidAmount = charge.allocations.reduce((total, allocation) => {
        if (allocation.payment.isVisibleInFinancialSummary === false) {
          return total;
        }
        return total + decimalToNumber(allocation.amount);
      }, 0);
      const inMemoryAllocated = inMemoryAllocationsByChargeId.get(charge.id) ?? 0;
      const paidAmount = dbPaidAmount + inMemoryAllocated;
      const interestAmount = decimalToNumber(charge.interestAmount);
      const discountAmount = decimalToNumber(charge.discountAmount);

      const inMemoryDates = inMemoryAllocationDatesByChargeId.get(charge.id) || new Set<string>();

      const paymentDates = Array.from(
        new Set([
          ...charge.allocations
            .filter((alloc) => alloc.payment.isVisibleInFinancialSummary !== false)
            .map((alloc) => {
              const date = alloc.payment.paidAt;
              const day = date.getDate().toString().padStart(2, "0");
              const monthNames = [
                "ene",
                "feb",
                "mar",
                "abr",
                "may",
                "jun",
                "jul",
                "ago",
                "sep",
                "oct",
                "nov",
                "dic",
              ];
              const month = monthNames[date.getMonth()];
              const year = date.getFullYear();
              return `${day} ${month} ${year}`;
            }),
          ...inMemoryDates,
        ])
      );

      return {
        id: charge.id,
        periodYear: charge.periodYear,
        periodMonth: charge.periodMonth,
        amount: chargedAmount,
        dueDate: charge.dueDate,
        status: charge.status,
        chargeGroupId: charge.chargeGroupId,
        concept: charge.concept,
        chargeGroupName: charge.chargeGroup.name,
        chargeGroupType: charge.chargeGroup.chargeType,
        paidAmount,
        balanceAmount: chargedAmount - paidAmount + interestAmount - discountAmount,
        interestAmount,
        discountAmount,
        responsibility: charge.responsibility,
        paymentDates,
      };
    });

    const paymentMovementsById = new Map<string, PrivateAreaPaymentMovement>();
    const paymentLegacyIds = new Set<number>();

    for (const charge of area.charges) {
      for (const allocation of charge.allocations) {
        const payment = allocation.payment;
        if (payment.isVisibleInFinancialSummary === false) {
          continue;
        }
        if (payment.legacyId !== null) {
          paymentLegacyIds.add(payment.legacyId);
        }
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
          responsibility: charge.responsibility,
        });
      }
    }

    // Include Incomes that are not tied to charges
    for (const income of area.incomes) {
      if (income.legacyId !== null && paymentLegacyIds.has(income.legacyId)) {
        // Skip duplicate legacy incomes already added as Payments
        continue;
      }
      if (!paymentMovementsById.has(income.id)) {
        const isComercio = income.chargeGroup?.name
          ? income.chargeGroup.name.toLowerCase().includes("comercio") || income.chargeGroup.name.toLowerCase().includes("comercios")
          : false;
        const responsibility = isComercio ? "COMMERCE" : "OWNER";

        paymentMovementsById.set(income.id, {
          paymentId: income.id,
          paidAt: income.date,
          method: toPaymentMethod(income.paymentMethod || "OTHER"),
          reference: income.concept,
          notes: income.notes,
          allocatedAmount: decimalToNumber(income.amount), // Count the whole income as allocated to the area
          paymentTotalAmount: decimalToNumber(income.amount),
          responsibility,
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

    const rentals: PrivateAreaRentalLine[] = area.rentals.map((rental) => ({
      id: rental.id,
      tenantName: rental.tenantName,
      status: rental.status,
      startsAt: rental.startsAt,
      endsAt: rental.endsAt,
      notes: rental.notes,
      administrativeContactUser: rental.administrativeContactUser
        ? {
            id: rental.administrativeContactUser.id,
            name: toUserDisplayName(rental.administrativeContactUser),
            email: rental.administrativeContactUser.email,
            phone: rental.administrativeContactUser.phone,
          }
        : null,
      operativeContactUser: rental.operativeContactUser
        ? {
            id: rental.operativeContactUser.id,
            name: toUserDisplayName(rental.operativeContactUser),
            email: rental.operativeContactUser.email,
            phone: rental.operativeContactUser.phone,
          }
        : null,
    }));

    const collectibleCharges = area.charges.filter((c) => c.isCollectible);
    let totalPending = 0;
    let hasOlderThanOneMonth = false;

    for (const charge of collectibleCharges) {
      const amount = decimalToNumber(charge.amount);
      const dbPaid = charge.allocations.reduce((total, allocation) => {
        return total + decimalToNumber(allocation.amount);
      }, 0);
      const inMemoryAllocated = inMemoryAllocationsByChargeId.get(charge.id) ?? 0;
      const paid = dbPaid + inMemoryAllocated;
      const interest = decimalToNumber(charge.interestAmount);
      const discount = decimalToNumber(charge.discountAmount);
      const pending = amount - paid - discount + interest;

      if (pending > 0.01) {
        totalPending += pending;
        if (charge.periodYear < 2026 || (charge.periodYear === 2026 && charge.periodMonth < 6)) {
          hasOlderThanOneMonth = true;
        }
      }
    }

    const paymentStatusColor = totalPending > 0.01
      ? (hasOlderThanOneMonth ? "yellow" : "red")
      : "green";

    return {
      privateAreaId: area.id,
      condominiumId: area.condominiumId,
      name: area.name,
      code: area.code,
      level: area.level,
      sortOrder: area.sortOrder,
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
      m2ConstructionCommonArea: decimalToNullableNumber(area.m2ConstructionCommonArea),
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
      rentals,
      paymentStatusColor,
    };
  }
}

