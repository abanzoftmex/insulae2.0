import { PrismaClient } from "@prisma/client";
import { IRoleRepository } from "../domain/role.repository";
import { Role, ModuleCatalog, CreateRoleRequest, UpdateRoleRequest } from "../domain/role.types";

export class PrismaRoleRepository implements IRoleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(condominiumId: string): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: { condominiumId, isActive: true, legacyIdGral: 0 },
      orderBy: { name: "asc" },
      include: {
        permissions: {
          where: { isActive: true },
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
          where: { isActive: true },
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
    const role = await this.prisma.role.create({
      data: {
        condominiumId: req.condominiumId,
        name: req.name,
        description: req.description,
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
  }

  async update(req: UpdateRoleRequest): Promise<Role> {
    // We handle permissions by deleting old ones and creating new ones or updating
    // For simplicity in this modern architecture, we can do a transaction:
    return await this.prisma.$transaction(async (tx) => {
      // Update basic info
      await tx.role.update({
        where: { id: req.id, condominiumId: req.condominiumId },
        data: {
          name: req.name,
          description: req.description,
        },
      });

      // Delete existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { roleId: req.id },
      });

      // Create new permissions
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

  async delete(id: string, condominiumId: string): Promise<void> {
    await this.prisma.role.update({
      where: { id, condominiumId },
      data: { isActive: false },
    });
  }
}
