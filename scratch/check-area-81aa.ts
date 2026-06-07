import { prisma } from "../src/shared/infrastructure/db/prisma";

async function run() {
  const areaById = await prisma.privateArea.findUnique({
    where: { id: "81aa6f9f-1939-4685-91e1-51f84e7d3d84" },
    include: {
      assignments: {
        include: {
          user: true,
        }
      },
      rentals: {
        include: {
          administrativeContactUser: true,
          operativeContactUser: true,
        }
      },
    }
  });

  console.log("Area 81aa6f9f-1939-4685-91e1-51f84e7d3d84 in Insulae DB:", JSON.stringify(areaById, null, 2));
}

run().catch(console.error);

