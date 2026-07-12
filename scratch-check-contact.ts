import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "caro", mode: "insensitive" } },
        { firstName: { contains: "Caro", mode: "insensitive" } },
        { lastName: { contains: "Nardo", mode: "insensitive" } },
        { businessName: { contains: "Nardo", mode: "insensitive" } },
      ]
    }
  });

  console.log("=== SEARCH USERS ===");
  for (const u of users) {
    console.log("User:", {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      businessName: u.businessName,
      email: u.email,
      phone: u.phone,
    });
  }

  // Also search inside rentals where tenantName contains Caro
  const rentals = await prisma.rental.findMany({
    where: {
      tenantName: { contains: "Caro", mode: "insensitive" }
    },
    include: {
      administrativeContactUser: true,
      operativeContactUser: true,
    }
  });

  console.log("\n=== SEARCH RENTALS ===");
  for (const r of rentals) {
    console.log("Rental:", {
      id: r.id,
      tenantName: r.tenantName,
      adminContact: r.administrativeContactUser ? {
        email: r.administrativeContactUser.email,
        phone: r.administrativeContactUser.phone,
      } : null,
      operativeContact: r.operativeContactUser ? {
        email: r.operativeContactUser.email,
        phone: r.operativeContactUser.phone,
      } : null
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
