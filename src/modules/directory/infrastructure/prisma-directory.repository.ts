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
  let decoded = reference.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // ignore
  }

  if (!decoded) {
    return null;
  }

  const userId = decoded.includes(":commerce:") ? decoded.split(":commerce:")[0] : decoded.split(":")[0];
  return { id: userId };
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
      parentId: null,
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
        personalEmail: true,
        businessEmail: true,
        phone: true,
        personalPhone: true,
        businessPhone: true,
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
          select: {
            roleName: true,
            privateArea: {
              select: {
                name: true,
              },
            },
          },
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            registrationTypeCode: true,
            registrationTypeDesc: true,
            idVq: true,
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
          email: (user.email && user.email.includes("@")) ? user.email : (user.personalEmail || user.businessEmail || user.email),
          phone: user.phone || user.personalPhone || user.businessPhone,
          initialRole: user.initialRole,
          roles,
          assignmentRoles,
          assignedAreas,
          assignmentCount: user.assignments.length,
          children: user.children.map((c) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            registrationTypeCode: c.registrationTypeCode,
            registrationTypeDesc: c.registrationTypeDesc,
            idVq: c.idVq,
          })),
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
        birthDate: true,
        gender: true,
        apolfap: true,
        registrationTypeCode: true,
        registrationTypeDesc: true,
        idVq: true,
        children: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            lastNamePaterno: true,
            lastNameMaterno: true,
            curp: true,
            personalPhone: true,
            personalEmail: true,
            birthDate: true,
            gender: true,
            registrationTypeCode: true,
            registrationTypeDesc: true,
            idVq: true,
            apolfap: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
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
                rentals: {
                  select: {
                    tenantName: true,
                    commerce: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
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
      legal: { title: "Propietario Legal", roles: ["legal", "dueño legal", "propietario legal"] },
      pleno: { title: "Dominio actual", roles: ["pleno", "dominio actual", "dominio pleno", "dominio"] },
      arrendatario: { title: "Arrendatario", roles: ["arrendatario", "arrend", "arrendamiento"] },
      moral: { title: "Propietario Inicial", roles: ["moral", "dueño moral", "inicial", "propietario inicial"] },
    };

    // Pre-calculate area name sets for cross-block filtering
    const legalNames = new Set(
      user.assignments
        .filter((a) => {
          const r = (a.roleName || "").toLowerCase();
          return ["legal", "dueño legal", "propietario legal"].some((keyword) => r.includes(keyword));
        })
        .map((a) => a.privateArea.name)
    );
    const plenoNames = new Set(
      user.assignments
        .filter((a) => {
          const r = (a.roleName || "").toLowerCase();
          return ["pleno", "dominio actual", "dominio pleno", "dominio"].some((keyword) => r.includes(keyword));
        })
        .map((a) => a.privateArea.name)
    );
    const arrendNames = new Set(
      user.assignments
        .filter((a) => {
          const r = (a.roleName || "").toLowerCase();
          return ["arrendatario", "arrend", "arrendamiento"].some((keyword) => r.includes(keyword));
        })
        .map((a) => a.privateArea.name)
    );

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
          if (key === "legal") {
            entityType = "Propietario Legal";
          } else if (key === "pleno") {
            entityType = "Dominio actual";
          } else if (key === "arrendatario") {
            entityType = "Arrendatario";
          } else if (key === "moral") {
            entityType = "Propietario Inicial";
          }

          const rentalCommerceNames = uniqueSorted(
            (area.rentals ?? [])
              .map((r) => r.commerce?.name || r.tenantName || "")
              .filter(Boolean)
          );

          const userCommerceNames = uniqueSorted(
            user.commerces.map((c) => c.commerceName).filter(Boolean)
          );

          const commerceNames = rentalCommerceNames.length > 0
            ? rentalCommerceNames
            : userCommerceNames;

          rows.push({
            entityType,
            privateAreaName: area.name,
            percentage,
            hasCommerces: commerceNames.length > 0,
            commerceNames,
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
      condominiumId: condominium.id,
      birthDate: user.birthDate ? user.birthDate.toISOString().split("T")[0] : null,
      gender: user.gender,
      apolfap: user.apolfap || (user.assignments.length > 0 ? user.assignments[0].privateArea.name : null),
      registrationTypeCode: user.registrationTypeCode,
      registrationTypeDesc: user.registrationTypeDesc,
      idVq: user.idVq,
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
      children: user.children.map((child) => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        lastNamePaterno: child.lastNamePaterno,
        lastNameMaterno: child.lastNameMaterno,
        curp: child.curp,
        personalPhone: child.personalPhone,
        personalEmail: child.personalEmail,
        birthDate: child.birthDate ? child.birthDate.toISOString().split("T")[0] : null,
        gender: child.gender,
        registrationTypeCode: child.registrationTypeCode,
        registrationTypeDesc: child.registrationTypeDesc,
        idVq: child.idVq,
        apolfap: child.apolfap,
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

  async updateContact(id: string, data: Partial<DirectoryContactParticipation>): Promise<{ idVq: string | null }> {
    let decoded = id.trim();
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // ignore
    }
    const targetId = decoded.includes(":commerce:") ? decoded.split(":commerce:")[0] : decoded.split(":")[0];
    let finalIdVq: string | null = null;
    await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: targetId },
        select: {
          condominiumId: true,
          apolfap: true,
          registrationTypeCode: true,
          idVq: true,
          email: true,
        },
      });

      let calculatedIdVq: string | null = currentUser?.idVq || null;

      if (currentUser) {
        if (!calculatedIdVq || !calculatedIdVq.startsWith("#")) {
          const siblings = await tx.user.findMany({
            where: {
              condominiumId: currentUser.condominiumId,
              isActive: true,
              id: { not: id },
              idVq: { startsWith: "#" },
            },
            select: { idVq: true },
          });

          const usedNumbers = new Set(
            siblings
              .map((s) => {
                if (!s.idVq) return null;
                const numStr = s.idVq.replace("#", "");
                const val = parseInt(numStr, 10);
                return isNaN(val) ? null : val;
              })
              .filter((val): val is number => val !== null)
          );

          let nextNum = 1;
          while (usedNumbers.has(nextNum)) {
            nextNum++;
          }

          calculatedIdVq = `#${String(nextNum).padStart(3, "0")}`;
        }
      }

      finalIdVq = calculatedIdVq;

      const finalApol = (data.apolfap !== undefined ? data.apolfap : currentUser?.apolfap) || "";
      const finalRegCode = (data.registrationTypeCode !== undefined ? data.registrationTypeCode : currentUser?.registrationTypeCode) || "";
      const finalIdVqVal = calculatedIdVq || "";
      
      let computedEmail = currentUser?.email || null;
      if (finalApol && finalIdVqVal && finalRegCode) {
        computedEmail = `ID-${finalApol.trim()}${finalIdVqVal.trim()}-${finalRegCode.trim()}`;
      }

      const updatedUser = await tx.user.update({
        where: { id: targetId },
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
          email: computedEmail,
          personalEmail: data.personalEmail,
          businessEmail: data.businessEmail,
          phone: data.phone,
          personalPhone: data.personalPhone,
          businessPhone: data.businessPhone,
          taxStatusPdfUrl: data.taxStatusPdfUrl,
          initialRole: data.initialRole,
          birthDate: data.birthDate === undefined ? undefined : (data.birthDate ? new Date(data.birthDate) : null),
          gender: data.gender,
          apolfap: data.apolfap,
          registrationTypeCode: data.registrationTypeCode,
          registrationTypeDesc: data.registrationTypeDesc,
          idVq: calculatedIdVq,
        },
      });

      // Update nested child users' idVq and email if parent's apolfap / idVq changed
      if (currentUser && (data.apolfap !== undefined || calculatedIdVq !== currentUser.idVq)) {
        const children = await tx.user.findMany({
          where: { parentId: targetId, isActive: true },
          select: { id: true, idVq: true, registrationTypeCode: true, email: true },
        });

        for (const child of children) {
          const childApol = finalApol;
          const childRegCode = child.registrationTypeCode || "8-99";
          
          let suffix = "1";
          if (child.idVq) {
            const parts = child.idVq.split("-");
            const lastPart = parts[parts.length - 1];
            if (!isNaN(parseInt(lastPart, 10))) {
              suffix = lastPart;
            }
          }
          const newChildIdVq = `${finalIdVqVal}-${childRegCode}-${suffix}`;
          
          let computedChildEmail = null;
          if (childApol && newChildIdVq) {
            computedChildEmail = `ID-${childApol.trim()}${newChildIdVq.trim()}`;
          }

          await tx.user.update({
            where: { id: child.id },
            data: {
              idVq: newChildIdVq,
              email: computedChildEmail,
            },
          });
        }
      }

      if (data.initialRole !== undefined) {
        // Clear all existing UserRole links for this user
        await tx.userRole.deleteMany({
          where: { userId: id },
        });

        if (data.initialRole && data.initialRole.trim() !== "") {
          const role = await tx.role.findFirst({
            where: {
              condominiumId: updatedUser.condominiumId,
              name: data.initialRole,
              isActive: true,
            },
          });

          if (role) {
            await tx.userRole.create({
              data: {
                userId: id,
                roleId: role.id,
              },
            });
          }
        }
      }
    });

    return { idVq: finalIdVq };
  }
}
