import { prisma } from "@/shared/infrastructure/db/prisma";
import { 
  MiscIncomeCatalogRepository, 
  MiscIncomeConcept, 
  SaveMiscIncomeConcept 
} from "../domain/misc-income-catalog.repository";

export class PrismaMiscIncomeCatalogRepository implements MiscIncomeCatalogRepository {
  async findAll(condominiumId: string): Promise<MiscIncomeConcept[]> {
    // Ensure base receivable concepts exist so users can edit their quotaPeriod
    const chargeGroups = await prisma.chargeGroup.findMany({
      where: { condominiumId, isActive: true },
    });

    const groupMapByKind = new Map(chargeGroups.map((g) => [g.kind, g]));
    const ordinaryGroup = groupMapByKind.get("ORDINARY");

    const baseReceivablesConfig: Array<{ name: string; kind: string; order: number }> = [
      { name: "Cuotas ordinarias", kind: "ORDINARY", order: 1 },
      { name: "Cuotas STC", kind: "STC", order: 2 },
      { name: "Sancion", kind: "SANCTION", order: 3 },
      { name: "Comodato", kind: "COMODATO", order: 4 },
      { name: "Cuotas extraordinarias - Condóminos", kind: "EXTRA_CONDO", order: 5 },
      { name: "Cuota extraordinaria - Comercios", kind: "EXTRA_COMMERCE", order: 6 },
    ];

    for (const item of baseReceivablesConfig) {
      const group = groupMapByKind.get(item.kind as any) ?? ordinaryGroup;
      if (!group) continue;

      const existing = await prisma.miscIncomeCatalog.findFirst({
        where: {
          condominiumId,
          isActive: true,
          OR: [
            { chargeGroupId: group.id },
            { name: { equals: item.name, mode: "insensitive" } },
          ],
        },
      });

      if (!existing) {
        await prisma.miscIncomeCatalog.create({
          data: {
            condominiumId,
            name: group.name || item.name,
            chargeGroupId: group.id,
            quotaPeriodStart: new Date("2024-01-01T00:00:00.000Z"),
            quotaPeriodEnd: new Date("2026-12-31T23:59:59.999Z"),
            order: item.order,
            isActive: true,
          },
        });
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
