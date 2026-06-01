import mysql from "mysql2/promise";
import { prisma } from "../src/shared/infrastructure/db/prisma";

async function main() {
  const legacyConn = await mysql.createConnection({
    host: "216.238.67.137",
    user: "sistemasabanza_insulaeValquirico",
    password: "In$uL!ae25!",
    database: "sistemasabanza_insulaeValquirico",
  });

  const childrenLegacyIds = [
    3, 163, 164, 189, 1482, 1474, 1464, 1481, 1478, 1477, 1476, 1475, 1473,
    1461, 1463, 1466, 1467, 1468, 1470, 1483, 1698, 1472, 1465, 1469, 1699,
    1479, 159, 1674, 1480, 1460, 1471, 1462
  ];

  const [rows] = await legacyConn.query<any[]>(
    `SELECT id_areas_privativas, nombre, id_areas_privativas_padre, id_areas_privativas_hijo, es_fusion FROM AREAS_PRIVATIVAS WHERE id_areas_privativas IN (${childrenLegacyIds.join(",")})`
  );

  console.log("Legacy fields for children in Neon:");
  console.log(
    String("ID").padEnd(6) + " | " +
    String("Nombre").padEnd(30) + " | " +
    String("Padre").padStart(8) + " | " +
    String("Hijo").padStart(8) + " | " +
    String("Fusion").padStart(6)
  );
  console.log("-".repeat(70));
  for (const r of rows) {
    console.log(
      String(r.id_areas_privativas).padEnd(6) + " | " +
      r.nombre.padEnd(30) + " | " +
      String(r.id_areas_privativas_padre).padStart(8) + " | " +
      String(r.id_areas_privativas_hijo).padStart(8) + " | " +
      String(r.es_fusion).padStart(6)
    );
  }

  await legacyConn.end();
}

main();
