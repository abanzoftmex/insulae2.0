import { Prisma } from "@prisma/client";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  DirectoryContactParticipation,
  DirectoryFilters,
  DirectoryOverview,
  DirectoryPerson,
} from "../domain/directory";
import type { DirectoryRepository } from "../domain/directory.repository";

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function displayNameFrom(input: {
  businessName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}): string {
  const businessName = input.businessName?.trim();
  if (businessName) {
    return businessName;
  }

  const fullName = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();
  if (fullName) {
    return fullName;
  }

  if (input.email?.trim()) {
    return input.email.trim();
  }

  if (input.phone?.trim()) {
    return input.phone.trim();
  }

  return "Sin nombre";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base", numeric: true }),
  );
}

function resolveReferenceWhere(reference: string): Prisma.UserWhereInput | null {
  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }

  return { id: trimmed };
}

type DirectorySchemaCapabilities = {
  hasRequiresInvoice: boolean;
  hasUserCommerce: boolean;
};

let directorySchemaCapabilitiesCache: DirectorySchemaCapabilities | null = null;

export class PrismaDirectoryRepository implements DirectoryRepository {
  private async getDirectorySchemaCapabilities(): Promise<DirectorySchemaCapabilities> {
    if (
      directorySchemaCapabilitiesCache &&
      directorySchemaCapabilitiesCache.hasRequiresInvoice &&
      directorySchemaCapabilitiesCache.hasUserCommerce
    ) {
      return directorySchemaCapabilitiesCache;
    }

    const rows = await prisma.$queryRaw<
      Array<{ hasRequiresInvoice: boolean; hasUserCommerce: boolean }>
    >(Prisma.sql`
      SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'User'
            AND column_name = 'requiresInvoice'
        ) AS "hasRequiresInvoice",
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'UserCommerce'
        ) AS "hasUserCommerce"
    `);

    const resolved = rows[0] ?? { hasRequiresInvoice: false, hasUserCommerce: false };
    directorySchemaCapabilitiesCache = resolved;
    return resolved;
  }

  private async getCommerceRowsByUserId(
    userIds: string[],
  ): Promise<Map<string, Array<{ id: string; commerceName: string }>>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const capabilities = await this.getDirectorySchemaCapabilities();
    if (!capabilities.hasUserCommerce) {
      return new Map();
    }

    try {
      const rows = await prisma.$queryRaw<
        Array<{ id: string; userId: string; commerceName: string }>
      >(
        Prisma.sql`
          SELECT id, "userId", "commerceName"
          FROM "UserCommerce"
          WHERE "isActive" = true
            AND "userId" IN (${Prisma.join(userIds)})
          ORDER BY "sortOrder" ASC, "commerceName" ASC, id ASC
        `,
      );

      const byUserId = new Map<string, Array<{ id: string; commerceName: string }>>();
      for (const row of rows) {
        const current = byUserId.get(row.userId) ?? [];
        current.push({ id: row.id, commerceName: row.commerceName });
        byUserId.set(row.userId, current);
      }

      return byUserId;
    } catch {
      // DB schema still missing UserCommerce table.
      return new Map();
    }
  }

  private async getRequiresInvoiceByUserId(userIds: string[]): Promise<Map<string, boolean | null>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const capabilities = await this.getDirectorySchemaCapabilities();
    if (!capabilities.hasRequiresInvoice) {
      return new Map();
    }

    try {
      const rows = await prisma.$queryRaw<Array<{ id: string; requiresInvoice: boolean | null }>>(
        Prisma.sql`
          SELECT id, "requiresInvoice"
          FROM "User"
          WHERE id IN (${Prisma.join(userIds)})
        `,
      );

      return new Map(rows.map((row) => [row.id, row.requiresInvoice]));
    } catch {
      // DB schema still missing requiresInvoice column.
      return new Map();
    }
  }

  async getDirectory(filters: DirectoryFilters): Promise<DirectoryOverview | null> {
    const condominium =
      (await prisma.condominium.findFirst({
        where: {
          isActive: true,
          slug: PROJECT_SCOPE.condominiumCode,
        },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      })) ??
      (await prisma.condominium.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      }));

    if (!condominium) {
      return null;
    }

    const query = normalizeText(filters.query);

    const where: Prisma.UserWhereInput = {
      condominiumId: condominium.id,
      isActive: true,
      NOT: { userType: "ADMIN" },
    };

    if (query) {
      where.OR = [
        { businessName: { contains: filters.query, mode: "insensitive" } },
        { firstName: { contains: filters.query, mode: "insensitive" } },
        { lastName: { contains: filters.query, mode: "insensitive" } },
        { email: { contains: filters.query, mode: "insensitive" } },
        { phone: { contains: filters.query, mode: "insensitive" } },
        {
          userRoles: {
            some: {
              role: {
                name: { contains: filters.query, mode: "insensitive" },
              },
            },
          },
        },
        {
          assignments: {
            some: {
              isActive: true,
              roleName: { contains: filters.query, mode: "insensitive" },
            },
          },
        },
        {
          assignments: {
            some: {
              isActive: true,
              privateArea: {
                name: { contains: filters.query, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { businessName: "asc" },
        { firstName: "asc" },
        { lastName: "asc" },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        userType: true,
        businessName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
        },
        assignments: {
          where: { isActive: true },
          select: {
            roleName: true,
            privateArea: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const requiresInvoiceByUserId = await this.getRequiresInvoiceByUserId(users.map((user) => user.id));
    const commercesByUserId = await this.getCommerceRowsByUserId(users.map((user) => user.id));
    const peopleExpanded = users
      .flatMap<DirectoryPerson>((user) => {
        const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
        const displayName = displayNameFrom(user);
        const roles = uniqueSorted(
          user.userRoles
            .filter((item) => item.role.isActive)
            .map((item) => item.role.name),
        );
        const assignmentRoles = uniqueSorted(
          user.assignments.map((assignment) => assignment.roleName ?? "").filter(Boolean),
        );
        const assignedAreas = uniqueSorted(
          user.assignments.map((assignment) => assignment.privateArea.name),
        );
        const commerces = commercesByUserId.get(user.id) ?? [];

        const basePerson: Omit<DirectoryPerson, "id" | "commerceName"> = {
          displayName,
          legalName: fullName || displayName,
          userType: user.userType,
          requiresInvoice: requiresInvoiceByUserId.get(user.id) ?? null,
          email: user.email,
          phone: user.phone,
          roles,
          assignmentRoles,
          assignedAreas,
          assignmentCount: user.assignments.length,
        };

        if (commerces.length === 0) {
          return [
            {
              id: user.id,
              commerceName: null,
              ...basePerson,
            },
          ];
        }

        return commerces.map((commerce) => ({
          id: `${user.id}:commerce:${commerce.id}`,
          commerceName: commerce.commerceName,
          ...basePerson,
        }));
      })
      .sort((a, b) => {
        const byName = a.displayName.localeCompare(b.displayName, "es", {
          sensitivity: "base",
          numeric: true,
        });

        if (byName !== 0) {
          return byName;
        }

        return (a.commerceName ?? "").localeCompare(b.commerceName ?? "", "es", {
          sensitivity: "base",
          numeric: true,
        });
      });

    const totalRows = peopleExpanded.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / filters.pageSize));
    const page = Math.min(filters.page, totalPages);
    const skip = (page - 1) * filters.pageSize;
    const people = peopleExpanded.slice(skip, skip + filters.pageSize);

    const totalAssignments = await prisma.residentAssignment.count({
      where: {
        condominiumId: condominium.id,
        isActive: true,
      },
    });

    return {
      condominiumId: condominium.id,
      condominiumSlug: condominium.slug,
      condominiumName: condominium.name,
      totalUsers: totalRows,
      totalAssignments,
      pagination: {
        page,
        pageSize: filters.pageSize,
        totalRows,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
      people,
    };
  }

  async getContactParticipation(reference: string): Promise<DirectoryContactParticipation | null> {
    const referenceWhere = resolveReferenceWhere(reference);
    if (!referenceWhere) {
      return null;
    }

    const condominium =
      (await prisma.condominium.findFirst({
        where: {
          isActive: true,
          slug: PROJECT_SCOPE.condominiumCode,
        },
        select: { id: true },
      })) ??
      (await prisma.condominium.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      }));

    if (!condominium) {
      return null;
    }

    const user = await prisma.user.findFirst({
      where: {
        condominiumId: condominium.id,
        isActive: true,
        ...referenceWhere,
      },
      select: {
        id: true,
        userType: true,
        businessName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
        },
        assignments: {
          where: { isActive: true },
          orderBy: [{ privateArea: { name: "asc" } }, { roleName: "asc" }],
          select: {
            roleName: true,
            privateArea: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const requiresInvoiceByUserId = await this.getRequiresInvoiceByUserId([user.id]);

    return {
      id: user.id,
      displayName: displayNameFrom(user),
      userType: user.userType,
      requiresInvoice: requiresInvoiceByUserId.get(user.id) ?? null,
      email: user.email,
      phone: user.phone,
      roles: uniqueSorted(
        user.userRoles
          .filter((item) => item.role.isActive)
          .map((item) => item.role.name),
      ),
      assignments: user.assignments.map((assignment) => ({
        privateAreaId: assignment.privateArea.id,
        privateAreaName: assignment.privateArea.name,
        roleName: assignment.roleName?.trim() || "Sin rol",
      })),
    };
  }
}
