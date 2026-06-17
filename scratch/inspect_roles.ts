import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  try {
    console.log("Listing roles in database...");
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        condominiumId: true,
        legacyId: true,
        legacyIdGral: true,
      },
    });
    console.log("Roles:", JSON.stringify(roles, null, 2));
  } catch (error) {
    console.error("Error querying roles:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
