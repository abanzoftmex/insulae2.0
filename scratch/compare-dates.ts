import { prisma } from "../src/shared/infrastructure/db/prisma";
import mysql from "mysql2/promise";

async function main() {
  const legacyConn = await mysql.createConnection({
    host: "216.238.67.137",
    user: "sistemasabanza_insulaeValquirico",
    password: "In$uL!ae25!",
    database: "sistemasabanza_insulaeValquirico",
  });

  const [legacyCharges] = await legacyConn.query<any[]>(
    "SELECT id_pagos, fechaPago, fechaVigencia FROM PAGOS WHERE id_areas_privativas = 814 AND activo = 1 LIMIT 5"
  );

  console.log("=== LEGACY CHARGES DATES ===");
  for (const lc of legacyCharges) {
    console.log(`  Legacy ID=${lc.id_pagos} | fechaPago=${lc.fechaPago?.toISOString().split('T')[0]} | fechaVigencia=${lc.fechaVigencia?.toISOString().split('T')[0]}`);
  }

  console.log("\n=== NEON CHARGES DATES ===");
  for (const lc of legacyCharges) {
    const nc = await prisma.charge.findFirst({
      where: { legacyId: lc.id_pagos }
    });
    if (nc) {
      console.log(`  Neon ID=${nc.id} (legacyId=${nc.legacyId}) | dueDate=${nc.dueDate?.toISOString().split('T')[0]} | createdAt=${nc.createdAt.toISOString().split('T')[0]}`);
    }
  }

  await legacyConn.end();
}

main().catch(console.error);
