
import { prisma } from "../shared/infrastructure/db/prisma";

async function main() {
  const area = await prisma.privateArea.findFirst({
    where: { name: "VQ#0P1" },
    include: {
      rentals: true,
      assignments: {
        include: { user: true }
      }
    }
  });

  console.log("Area VQ#0P1:", area ? { id: area.id, name: area.name } : "Not found");
  if (area) {
    console.log("Rentals count:", area.rentals.length);
    console.log("Rentals:", JSON.stringify(area.rentals, null, 2));
    console.log("Assignments:", JSON.stringify(area.assignments, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
