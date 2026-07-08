import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const role = await prisma.role.findFirst({
    where: { name: "Becario" },
    include: {
      permissions: {
        where: { isActive: true },
        include: { module: true }
      }
    }
  });

  if (!role) {
    console.log("No role named 'Becario' found.");
    return;
  }

  console.log(`Role: ${role.name}`);
  console.log("Permissions count:", role.permissions.length);
  role.permissions.forEach(p => {
    console.log(`  - Module: ${p.module.name} | canRead: ${p.canRead}, canCreate: ${p.canCreate}, canUpdate: ${p.canUpdate}, canDelete: ${p.canDelete}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
