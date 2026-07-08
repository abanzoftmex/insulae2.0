import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      id: '929963d1-88fc-49a1-b85d-833ce8911446'
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      initialRole: true,
      userType: true,
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        }
      }
    }
  });

  console.log("Users:", JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
