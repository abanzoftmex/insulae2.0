import { Prisma, PrismaClient } from "@prisma/client";
import { IRoleRepository } from "../domain/role.repository";
import {
  Role,
  ModuleCatalog,
  CreateRoleRequest,
  UpdateRoleRequest,
  UpdateRoleColorRequest,
  RoleDeactivationImpact,
  DeactivateRoleResult,
} from "../domain/role.types";
import {
  assertValidRoleHexColor,
  pickSuggestedRoleColor,
} from "../domain/role-colors";
import {
  evaluateRoleDeactivationImpact,
  type PolicyRoleRecord,
  type PolicyUserRecord,
} from "../domain/role-deactivation.policy";
import {
  assertCanDeleteOrDeactivateRole,
  assertValidRoleCreationName,
  assertValidRoleUpdate,
} from "../domain/role-protection";

type PrismaDbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaRoleRepository implements IRoleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(condominiumId: string): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: {
        condominiumId,
      },
      orderBy: [{ isActive: "desc" }, { legacyIdGral: "asc" }, { name: "asc" }],
      include: {
        permissions: {
          where: { isActive: true, module: { isActive: true } },
          include: { module: true },
        },
      },
    }) as unknown as Role[];
  }

  async findById(id: string, condominiumId: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id, condominiumId, isActive: true },
      include: {
        permissions: {
          where: { isActive: true, module: { isActive: true } },
          include: { module: true },
        },
      },
    }) as unknown as Role | null;
  }

  async findModules(): Promise<ModuleCatalog[]> {
    return this.prisma.moduleCatalog.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async create(req: CreateRoleRequest): Promise<Role> {
    return await this.prisma.$transaction(async (tx) => {
      const existingRoles = await tx.role.findMany({
        where: { condominiumId: req.condominiumId },
        select: { id: true, name: true, legacyIdGral: true, color: true },
      });

      const validName = assertValidRoleCreationName(req.name, existingRoles);
      const validColor = req.color
        ? assertValidRoleHexColor(req.color)
        : pickSuggestedRoleColor(existingRoles.map((r) => r.color));

      const role = await tx.role.create({
        data: {
          condominiumId: req.condominiumId,
          legacyIdGral: 0,
          name: validName,
          description: req.description?.trim() || null,
          color: validColor,
          permissions: {
            create: req.permissions.map((p) => ({
              moduleId: p.moduleId,
              canCreate: p.canCreate,
              canUpdate: p.canUpdate,
              canRead: p.canRead,
              canDelete: p.canDelete,
            })),
          },
        },
        include: {
          permissions: {
            include: { module: true },
          },
        },
      });
      return role as unknown as Role;
    });
  }

  async update(req: UpdateRoleRequest): Promise<Role> {
    return await this.prisma.$transaction(async (tx) => {
      const [existing, condoRoles] = await Promise.all([
        tx.role.findUnique({
          where: { id: req.id, condominiumId: req.condominiumId },
          select: { id: true, name: true, legacyIdGral: true, isActive: true, color: true },
        }),
        tx.role.findMany({
          where: { condominiumId: req.condominiumId },
          select: { id: true, name: true, legacyIdGral: true },
        }),
      ]);

      if (!existing) {
        throw new Error("El rol no existe en este condominio.");
      }

      const validName = assertValidRoleUpdate(existing, req.name, condoRoles);
      const validColor = req.color !== undefined && req.color !== null
        ? assertValidRoleHexColor(req.color)
        : existing.color;

      await tx.role.update({
        where: { id: req.id, condominiumId: req.condominiumId },
        data: {
          name: validName,
          description: req.description,
          ...(validColor !== undefined ? { color: validColor } : {}),
        },
      });

      await tx.rolePermission.deleteMany({
        where: { roleId: req.id },
      });

      await tx.rolePermission.createMany({
        data: req.permissions.map((p) => ({
          roleId: req.id,
          moduleId: p.moduleId,
          canCreate: p.canCreate,
          canUpdate: p.canUpdate,
          canRead: p.canRead,
          canDelete: p.canDelete,
        })),
      });

      const updatedRole = await tx.role.findUnique({
        where: { id: req.id },
        include: {
          permissions: {
            include: { module: true },
          },
        },
      });

      return updatedRole as unknown as Role;
    });
  }

  async updateColor(req: UpdateRoleColorRequest): Promise<Role> {
    const validColor = assertValidRoleHexColor(req.color);
    const existing = await this.prisma.role.findUnique({
      where: { id: req.id, condominiumId: req.condominiumId },
      select: { id: true, name: true, legacyIdGral: true, isActive: true },
    });

    if (!existing || !existing.isActive) {
      throw new Error("El rol no existe o se encuentra inactivo.");
    }

    // Actualiza EXCLUSIVAMENTE el color del rol.
    // Nombre, descripción, legacyIdGral, estado y permisos permanecen intactos.
    const updated = await this.prisma.role.update({
      where: { id: req.id, condominiumId: req.condominiumId },
      data: { color: validColor },
      include: {
        permissions: {
          where: { isActive: true, module: { isActive: true } },
          include: { module: true },
        },
      },
    });

    return updated as unknown as Role;
  }

  async delete(id: string, condominiumId: string, actingUserId?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const target = await tx.role.findUnique({
        where: { id, condominiumId },
        select: { id: true, name: true, legacyIdGral: true, isActive: true },
      });

      if (!target || !target.isActive) {
        throw new Error("El rol no existe o ya se encuentra inactivo.");
      }

      assertCanDeleteOrDeactivateRole(target);

      if (actingUserId) {
        const { roles, users } = await this.loadDeactivationPolicyInputs(
          tx,
          condominiumId,
          actingUserId
        );
        const { impact } = evaluateRoleDeactivationImpact({
          targetRoleId: id,
          actingUserId,
          roles,
          users,
        });
        if (!impact.canDeactivate) {
          throw new Error(impact.blockReason || "No es posible eliminar este rol.");
        }
      }

      const result = await tx.role.updateMany({
        where: { id, condominiumId, isActive: true },
        data: { isActive: false },
      });

      if (result.count !== 1) {
        throw new Error("El rol no existe o ya se encuentra inactivo.");
      }
    });
  }

  async getDeactivationImpact(
    id: string,
    condominiumId: string,
    actingUserId: string
  ): Promise<RoleDeactivationImpact> {
    const { roles, users } = await this.loadDeactivationPolicyInputs(
      this.prisma,
      condominiumId,
      actingUserId
    );
    const { impact } = evaluateRoleDeactivationImpact({
      targetRoleId: id,
      actingUserId,
      roles,
      users,
    });
    return impact;
  }

  async deactivate(
    id: string,
    condominiumId: string,
    actingUserId: string
  ): Promise<DeactivateRoleResult> {
    return await this.prisma.$transaction(async (tx) => {
      const { roles, users } = await this.loadDeactivationPolicyInputs(
        tx,
        condominiumId,
        actingUserId
      );

      const { impact, userIdsToDeactivate } = evaluateRoleDeactivationImpact({
        targetRoleId: id,
        actingUserId,
        roles,
        users,
      });

      if (!impact.canDeactivate) {
        throw new Error(
          impact.blockReason || "No es posible desactivar este rol por restricciones de seguridad."
        );
      }

      const roleUpdate = await tx.role.updateMany({
        where: { id, condominiumId, isActive: true },
        data: { isActive: false },
      });

      if (roleUpdate.count !== 1) {
        throw new Error(
          "El rol ya fue desactivado o modificado por otra operación. Actualiza el listado."
        );
      }

      const permUpdate = await tx.rolePermission.updateMany({
        where: { roleId: id, isActive: true },
        data: { isActive: false },
      });

      if (userIdsToDeactivate.length > 0) {
        const userUpdate = await tx.user.updateMany({
          where: {
            id: { in: userIdsToDeactivate },
            condominiumId,
            isActive: true,
          },
          data: { isActive: false },
        });

        if (userUpdate.count !== userIdsToDeactivate.length) {
          throw new Error(
            "El estado de uno o más usuarios cambió durante la operación. Intenta nuevamente."
          );
        }
      }

      const deactivatedUsers = impact.assignedUsers
        .filter((u) => u.willBeDeactivated)
        .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email }));

      const retainedUsers = impact.assignedUsers
        .filter((u) => !u.willBeDeactivated)
        .map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          otherActiveRoles: u.otherActiveRoles,
        }));

      return {
        roleId: impact.role.id,
        roleName: impact.role.name,
        disabledPermissionsCount: permUpdate.count,
        deactivatedUsersCount: deactivatedUsers.length,
        retainedUsersCount: retainedUsers.length,
        deactivatedUsers,
        retainedUsers,
      };
    });
  }

  private async loadDeactivationPolicyInputs(
    db: PrismaDbClient,
    condominiumId: string,
    actingUserId: string
  ): Promise<{ roles: PolicyRoleRecord[]; users: PolicyUserRecord[] }> {
    const userSelect = {
      id: true,
      condominiumId: true,
      isActive: true,
      userType: true,
      firstName: true,
      lastName: true,
      lastNamePaterno: true,
      lastNameMaterno: true,
      businessName: true,
      commercialName: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      phone: true,
      personalPhone: true,
      businessPhone: true,
      initialRole: true,
      userRoles: {
        select: {
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
              isActive: true,
              legacyIdGral: true,
            },
          },
        },
      },
    } satisfies Prisma.UserSelect;

    const [roles, condoUsers, actingUser] = await Promise.all([
      db.role.findMany({
        where: { condominiumId },
        select: {
          id: true,
          condominiumId: true,
          legacyIdGral: true,
          name: true,
          description: true,
          isActive: true,
          permissions: {
            select: {
              isActive: true,
              canRead: true,
              canCreate: true,
              canUpdate: true,
              canDelete: true,
              module: {
                select: {
                  name: true,
                  isActive: true,
                },
              },
            },
          },
        },
      }),
      db.user.findMany({
        where: { condominiumId, isActive: true },
        select: userSelect,
      }),
      db.user.findUnique({
        where: { id: actingUserId },
        select: userSelect,
      }),
    ]);

    const users: PolicyUserRecord[] = [...condoUsers];
    if (actingUser && !users.some((u) => u.id === actingUser.id)) {
      users.push(actingUser);
    }

    return { roles, users };
  }
}
