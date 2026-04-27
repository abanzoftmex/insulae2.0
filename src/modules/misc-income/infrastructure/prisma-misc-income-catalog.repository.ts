import { prisma } from "@/shared/infrastructure/db/prisma";
import { 
  MiscIncomeCatalogRepository, 
  MiscIncomeConcept, 
  SaveMiscIncomeConcept 
} from "../domain/misc-income-catalog.repository";

export class PrismaMiscIncomeCatalogRepository implements MiscIncomeCatalogRepository {
  async findAll(condominiumId: string): Promise<MiscIncomeConcept[]> {
    const items = await prisma.miscIncomeCatalog.findMany({
      where: {
        condominiumId,
        isActive: true,
      },
      orderBy: [
        { order: "asc" },
        { name: "asc" }
      ],
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      chargeGroupId: item.chargeGroupId,
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
