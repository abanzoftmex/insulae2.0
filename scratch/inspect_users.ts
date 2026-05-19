import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  try {
    console.log("Listing users in database...");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        personalEmail: true,
        businessEmail: true,
        firstName: true,
        lastName: true,
        userType: true,
        isActive: true,
      },
      take: 20
    });
    console.log("Users:", JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error querying users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
