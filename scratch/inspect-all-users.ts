import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      initialRole: true,
      userType: true,
    }
  });

  console.log("All users in database:", users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
