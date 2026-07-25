import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return;

  const ordinaryGroup = await prisma.chargeGroup.findFirst({
    where: { condominiumId: condo.id, kind: "ORDINARY", isActive: true },
  });

  if (!ordinaryGroup) {
    console.error("No ORDINARY charge group found");
    return;
  }

  const baseReceivables = [
    { name: "Cuotas ordinarias", order: 1 },
    { name: "Cuotas STC", order: 2 },
    { name: "Sancion", order: 3 },
    { name: "Comodato", order: 4 },
  ];

  for (const item of baseReceivables) {
    const existing = await prisma.miscIncomeCatalog.findFirst({
      where: {
        condominiumId: condo.id,
        isActive: true,
        name: { equals: item.name, mode: "insensitive" },
      },
    });

    if (!existing) {
      const created = await prisma.miscIncomeCatalog.create({
        data: {
          condominiumId: condo.id,
          name: item.name,
          chargeGroupId: ordinaryGroup.id,
          quotaPeriodStart: new Date("2025-01-01T00:00:00.000Z"),
          quotaPeriodEnd: new Date("2026-12-31T23:59:59.999Z"),
          order: item.order,
          isActive: true,
        },
      });
      console.log(`Created base concept: "${created.name}" (ID: ${created.id})`);
    } else {
      console.log(`Base concept already exists: "${existing.name}" (ID: ${existing.id})`);
    }
  }

  // Also bump order of existing misc items if needed so base items appear at top or orderly
  const all = await prisma.miscIncomeCatalog.findMany({
    where: { condominiumId: condo.id, isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  console.log("\nTotal MiscIncomeCatalog items now:", all.length);
  all.forEach((c, idx) => console.log(`${idx + 1}. [Order ${c.order}] "${c.name}" (${c.quotaPeriodStart?.toISOString().slice(0, 7)} to ${c.quotaPeriodEnd?.toISOString().slice(0, 7)})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
