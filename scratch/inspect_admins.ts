import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  try {
    console.log("Listing ADMIN users in database...");
    const admins = await prisma.user.findMany({
      where: {
        userType: "ADMIN"
      },
      select: {
        id: true,
        email: true,
        personalEmail: true,
        businessEmail: true,
        firstName: true,
        lastName: true,
        userType: true,
        isActive: true,
      }
    });
    console.log("Admins:", JSON.stringify(admins, null, 2));
  } catch (error) {
    console.error("Error querying admins:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
