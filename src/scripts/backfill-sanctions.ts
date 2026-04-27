import { prisma } from "../shared/infrastructure/db/prisma";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

import { join } from "path";
dotenv.config({ path: join(process.cwd(), ".env") });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.LEGACY_DB_HOST,
    user: process.env.LEGACY_DB_USER,
    password: process.env.LEGACY_DB_PASSWORD,
    database: "sistemasabanza_insulae",
  });

  const [rows] = await connection.execute(
    `SELECT * FROM CAT_SANCIONES WHERE activo = 1`
  );

  const legacySanctions = rows as any[];
  console.log(`Found ${legacySanctions.length} legacy sanctions`);

  const condominium = await prisma.condominium.findFirst({
    where: { isActive: true },
  });

  if (!condominium) {
    throw new Error("No active condominium found");
  }

  let createdCount = 0;
  for (const s of legacySanctions) {
    const legacyId = s.id_cat_sanciones;
    const name = s.nombre;
    const article = s.articulo || null;

    // Skip if already exists
    const existing = await prisma.sanctionCatalog.findFirst({
      where: { legacyId, condominiumId: condominium.id },
    });

    if (!existing) {
      await prisma.sanctionCatalog.create({
        data: {
          condominiumId: condominium.id,
          legacyId,
          name,
          article,
          isActive: true,
        },
      });
      createdCount++;
    }
  }

  console.log(`Migrated ${createdCount} sanctions.`);
  await connection.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
