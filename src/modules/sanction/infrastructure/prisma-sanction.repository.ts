import { PrismaClient } from "@prisma/client";
import { Sanction, SanctionRepository, CreateSanctionRequest, UpdateSanctionRequest } from "../domain/sanction.types";

export class PrismaSanctionRepository implements SanctionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(condominiumId: string): Promise<Sanction[]> {
    return this.prisma.sanctionCatalog.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string, condominiumId: string): Promise<Sanction | null> {
    return this.prisma.sanctionCatalog.findFirst({
      where: { id, condominiumId, isActive: true },
    });
  }

  async create(data: CreateSanctionRequest): Promise<Sanction> {
    return this.prisma.sanctionCatalog.create({
      data: {
        condominiumId: data.condominiumId,
        name: data.name,
        article: data.article,
        isActive: true,
      },
    });
  }

  async update(data: UpdateSanctionRequest): Promise<Sanction> {
    const existing = await this.findById(data.id, data.condominiumId);
    if (!existing) {
      throw new Error("Sanction not found or unauthorized");
    }

    return this.prisma.sanctionCatalog.update({
      where: { id: data.id },
      data: {
        name: data.name,
        article: data.article,
      },
    });
  }

  async delete(id: string, condominiumId: string): Promise<void> {
    const existing = await this.findById(id, condominiumId);
    if (!existing) {
      throw new Error("Sanction not found or unauthorized");
    }

    // Soft delete
    await this.prisma.sanctionCatalog.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
