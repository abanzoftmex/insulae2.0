import { Prisma } from "@prisma/client";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

import type {
  DirectoryContactParticipation,
  DirectoryFilters,
  DirectoryOverview,
  DirectoryPerson,
  ParticipationBlock,
  ParticipationRow,
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
        select: {
          id: true,
          projects: {
            where: { isActive: true },
            take: 1,
            select: { totalM2: true },
          },
        },
      })) ??
      (await prisma.condominium.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          projects: {
            where: { isActive: true },
            take: 1,
            select: { totalM2: true },
          },
        },
      }));

    if (!condominium) {
      return null;
    }

    const totalM2Project = Number(condominium.projects[0]?.totalM2 ?? 0);

    const user = await prisma.user.findFirst({
      where: {
        condominiumId: condominium.id,
        isActive: true,
        ...referenceWhere,
      },
      select: {
        id: true,
        userType: true,
        firstName: true,
        lastName: true,
        lastNamePaterno: true,
        lastNameMaterno: true,
        businessName: true,
        commercialName: true,
        curp: true,
        rfc: true,
        address: true,
        taxAddress: true,
        email: true,
        personalEmail: true,
        businessEmail: true,
        phone: true,
        personalPhone: true,
        businessPhone: true,
        requiresInvoice: true,
        taxStatusPdfUrl: true,
        initialRole: true,
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
          orderBy: [{ privateArea: { sortOrder: "asc" } }, { privateArea: { name: "asc" } }],
          select: {
            roleName: true,
            privateArea: {
              select: {
                id: true,
                name: true,
                sortOrder: true,
                indiviso: true,
                m2CommonArea: true,
                m2Construction: true,
                m2Original: true,
                parentPrivateArea: {
                  select: {
                    id: true,
                    name: true,
                    sortOrder: true,
                    indiviso: true,
                    m2CommonArea: true,
                    m2Original: true,
                    m2ConstructionChildren: true,
                  },
                },
              },
            },
          },
        },
        commerces: {
          where: { isActive: true },
          orderBy: { commerceName: "asc" },
          select: {
            id: true,
            commerceName: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Process participation blocks
    const blockMap: Record<string, { title: string; roles: string[] }> = {
      legal: { title: "Propietario Legal", roles: ["legal"] },
      pleno: { title: "Dominio actual", roles: ["pleno"] },
      arrendatario: { title: "Arrendatario", roles: ["arrendatario", "arrend"] },
      moral: { title: "Propietario Inicial", roles: ["moral"] },
    };

    // Pre-calculate area name sets for cross-block filtering
    const legalNames = new Set(user.assignments.filter(a => (a.roleName || "").toLowerCase().includes("legal")).map(a => a.privateArea.name));
    const plenoNames = new Set(user.assignments.filter(a => (a.roleName || "").toLowerCase().includes("pleno")).map(a => a.privateArea.name));
    const arrendNames = new Set(user.assignments.filter(a => (a.roleName || "").toLowerCase().includes("arrend")).map(a => a.privateArea.name));

    const blocks: ParticipationBlock[] = Object.entries(blockMap).map(([key, config]) => {
      const rows: ParticipationRow[] = [];
      const seenNames = new Set<string>();

      // Sort user assignments by sortOrder and then name
      const sortedAssignments = [...user.assignments].sort((a, b) => {
        const orderA = a.privateArea.sortOrder || 0;
        const orderB = b.privateArea.sortOrder || 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.privateArea.name.localeCompare(b.privateArea.name, undefined, { numeric: true });
      });

      for (const assignment of sortedAssignments) {
        const roleLower = (assignment.roleName ?? "").toLowerCase();
        const matches = config.roles.some((r) => roleLower.includes(r));

        if (matches) {
          const area = assignment.privateArea;
          if (seenNames.has(area.name)) continue;

          // Legacy UI specific filtering rules:
          if (key === "pleno") {
            // "Dominio actual" block shows ONLY areas that are also in the "Legal" block
            if (!legalNames.has(area.name)) continue;
          } else if (key === "arrendatario") {
            // "Arrendatario" block shows ONLY areas that are NOT in the "Legal" block
            if (legalNames.has(area.name)) continue;
          } else if (key === "moral") {
            // "Propietario Inicial" block shows ONLY areas that are NOT in Pleno and NOT in Arrendatario
            if (plenoNames.has(area.name) || arrendNames.has(area.name)) continue;
          }

          seenNames.add(area.name);

          // Trust the m2Original/totalM2Project formula for the base indiviso
          let percentage = 0;
          const m2Total = Number(area.m2Original ?? 0);
          
          if (area.parentPrivateArea) {
            // Formula for sub-areas: (child.m2Construction / parent.m2ConstructionChildren) * ParentIndiviso
            const parentM2Total = Number(area.parentPrivateArea.m2Original ?? 0);
            const parentIndiviso = (parentM2Total / totalM2Project) * 100;
            const constructionChildren = Number(area.parentPrivateArea.m2ConstructionChildren ?? 0);

            if (constructionChildren > 0 && parentIndiviso > 0) {
              percentage = parentIndiviso * (Number(area.m2Construction ?? 0) / constructionChildren);
            } else {
              percentage = (m2Total / totalM2Project) * 100;
            }
          } else {
            // Base formula for areas without parent
            percentage = (m2Total / totalM2Project) * 100;
          }

          // Special case: if calculated is 0 but area has an indiviso in DB, trust the DB
          if (percentage === 0 && area.indiviso) {
            percentage = Number(area.indiviso);
          }

          // Normalize entity type naming to match legacy and fix encoding issues
          let entityType = assignment.roleName || "Sin rol";
          const normalizedRole = entityType.toLowerCase();
          
          if (config.roles.includes("legal") && (normalizedRole.includes("due") || normalizedRole.includes("legal") || normalizedRole.includes("propietario"))) {
            entityType = "Propietario Legal";
          } else if (config.roles.includes("pleno") && (normalizedRole.includes("dominio") || normalizedRole.includes("pleno"))) {
            entityType = "Dominio actual";
          } else if (config.roles.includes("arrendatario") && (normalizedRole.includes("arrend"))) {
            entityType = "Arrendatario";
          } else if (config.roles.includes("moral") && (normalizedRole.includes("moral") || normalizedRole.includes("inicial"))) {
            entityType = "Propietario Inicial";
          }

          rows.push({
            entityType,
            privateAreaName: area.name,
            percentage,
            hasCommerces: false,
          });
        }
      }

      return {
        title: config.title,
        totalAreas: rows.length,
        totalPercentage: rows.reduce((sum, r) => sum + r.percentage, 0),
        rows,
      };
    });

    return {
      id: user.id,
      displayName: displayNameFrom(user),
      firstName: user.firstName,
      lastName: user.lastName,
      lastNamePaterno: user.lastNamePaterno,
      lastNameMaterno: user.lastNameMaterno,
      businessName: user.businessName,
      commercialName: user.commercialName,
      curp: user.curp,
      rfc: user.rfc,
      address: user.address,
      taxAddress: user.taxAddress,
      userType: user.userType,
      requiresInvoice: user.requiresInvoice,
      email: user.email,
      personalEmail: user.personalEmail,
      businessEmail: user.businessEmail,
      phone: user.phone,
      personalPhone: user.personalPhone,
      businessPhone: user.businessPhone,
      taxStatusPdfUrl: user.taxStatusPdfUrl,
      initialRole: user.initialRole,
      roles: uniqueSorted(
        user.userRoles
          .filter((item) => item.role.isActive)
          .map((item) => item.role.name),
      ),
      participationBlocks: blocks,
      linkedCommerces: user.commerces.map((c) => ({
        id: c.id,
        name: c.commerceName,
      })),
      assignments: user.assignments.map((assignment) => ({
        privateAreaId: assignment.privateArea.id,
        privateAreaName: assignment.privateArea.name,
        roleName: assignment.roleName?.trim() || "Sin rol",
      })),
    };
  }

  async getRoles(): Promise<Array<{ id: string; name: string }>> {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return roles;
  }

  async updateContact(id: string, data: Partial<DirectoryContactParticipation>): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        lastNamePaterno: data.lastNamePaterno,
        lastNameMaterno: data.lastNameMaterno,
        businessName: data.businessName,
        commercialName: data.commercialName,
        curp: data.curp,
        rfc: data.rfc,
        address: data.address,
        taxAddress: data.taxAddress,
        userType: data.userType,
        requiresInvoice: data.requiresInvoice,
        email: data.email,
        personalEmail: data.personalEmail,
        businessEmail: data.businessEmail,
        phone: data.phone,
        personalPhone: data.personalPhone,
        businessPhone: data.businessPhone,
        taxStatusPdfUrl: data.taxStatusPdfUrl,
        initialRole: data.initialRole,
      },
    });
  }
}
