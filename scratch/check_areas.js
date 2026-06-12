require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not defined in env");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const areas = await prisma.privateArea.findMany({
    where: {
      name: {
        contains: "SV001"
      }
    }
  });
  
  console.log(`Found ${areas.length} areas containing SV001:`);
  areas.forEach(a => {
    console.log(JSON.stringify(a, null, 2));
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
