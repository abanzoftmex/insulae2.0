import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const condoId = '85af33b0-38ac-4f92-bbc5-385e044ef53a';

  const inc = await prisma.income.findFirst({
    where: {
      condominiumId: condoId,
      legacyId: 7
    }
  });

  console.log("Record in DB with legacyId = 7:", inc);
}

main().catch(console.error).finally(() => prisma.$disconnect());
