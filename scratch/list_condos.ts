import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  try {
    console.log("Listing all condominiums...");
    const condos = await prisma.condominium.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      }
    });
    console.log("Condominiums:", JSON.stringify(condos, null, 2));
  } catch (error) {
    console.error("Error querying condominiums:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
