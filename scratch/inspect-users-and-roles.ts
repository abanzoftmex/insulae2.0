import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { firstName: { contains: "Auxiliar" } },
        { lastName: { contains: "Administrativo" } }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      initialRole: true,
      userType: true,
      userRoles: {
        include: {
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

  console.log("Users matching 'Auxiliar':", JSON.stringify(users, null, 2));

  // Find all roles named "Becario"
  const roles = await prisma.role.findMany({
    where: {
      name: {
        contains: "Becario"
      }
    },
    include: {
      permissions: {
        include: {
          module: true
        }
      }
    }
  });

  console.log("Roles matching 'Becario':", JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
