import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const email = "auxiliar@valquirico.com";
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { personalEmail: email },
        { businessEmail: email }
      ]
    }
  });

  console.log("User by email:", user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
