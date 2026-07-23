import { prisma } from "@/shared/infrastructure/db/prisma";
import { 
  MiscIncomeCatalogRepository, 
  MiscIncomeConcept, 
  SaveMiscIncomeConcept 
} from "../domain/misc-income-catalog.repository";

export class PrismaMiscIncomeCatalogRepository implements MiscIncomeCatalogRepository {
  async findAll(condominiumId: string): Promise<MiscIncomeConcept[]> {
    // Ensure base receivable concepts exist so users can edit their quotaPeriod
    const ordinaryGroup = await prisma.chargeGroup.findFirst({
      where: { condominiumId, kind: "ORDINARY", isActive: true },
    });

    if (ordinaryGroup) {
      const baseReceivables = [
        { name: "Cuotas ordinarias", order: 1 },
        { name: "Cuotas STC", order: 2 },
        { name: "Sancion", order: 3 },
        { name: "Comodato", order: 4 },
      ];

      for (const item of baseReceivables) {
        const existing = await prisma.miscIncomeCatalog.findFirst({
          where: {
            condominiumId,
            isActive: true,
            name: { equals: item.name, mode: "insensitive" },
          },
        });
        if (!existing) {
          await prisma.miscIncomeCatalog.create({
            data: {
              condominiumId,
              name: item.name,
              chargeGroupId: ordinaryGroup.id,
              quotaPeriodStart: new Date("2025-01-01T00:00:00.000Z"),
              quotaPeriodEnd: new Date("2026-12-31T23:59:59.999Z"),
              order: item.order,
              isActive: true,
            },
          });
        }
      }
    }

    const items = await prisma.miscIncomeCatalog.findMany({
      where: {
        condominiumId,
        isActive: true,
      },
      orderBy: [
        { order: "asc" },
        { quotaPeriodStart: "asc" },
        { name: "asc" }
      ],
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      chargeGroupId: item.chargeGroupId,
      quotaPeriodStart: item.quotaPeriodStart,
      quotaPeriodEnd: item.quotaPeriodEnd,
      isActive: item.isActive,
      order: item.order,
    }));
  }

  async save(condominiumId: string, concepts: SaveMiscIncomeConcept[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const concept of concepts) {
        if (concept.id) {
          await tx.miscIncomeCatalog.update({
            where: { id: concept.id },
            data: {
              name: concept.name,
              chargeGroupId: concept.chargeGroupId,
              quotaPeriodStart: concept.quotaPeriodStart,
              quotaPeriodEnd: concept.quotaPeriodEnd,
              isActive: concept.isActive ?? true,
              order: concept.order ?? 0,
            },
          });
        } else {
          await tx.miscIncomeCatalog.create({
            data: {
              condominiumId,
              name: concept.name,
              chargeGroupId: concept.chargeGroupId,
              quotaPeriodStart: concept.quotaPeriodStart,
              quotaPeriodEnd: concept.quotaPeriodEnd,
              isActive: true,
              order: concept.order ?? 0,
            },
          });
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.miscIncomeCatalog.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
