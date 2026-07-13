import "dotenv/config";
import mysql from "mysql2/promise";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

async function main() {
  const conn = await mysql.createConnection({
    host: requiredEnv("LEGACY_DB_HOST"),
    port: Number.parseInt(process.env.LEGACY_DB_PORT ?? "3306", 10),
    user: requiredEnv("LEGACY_DB_USER"),
    password: requiredEnv("LEGACY_DB_PASSWORD"),
    database: requiredEnv("LEGACY_DB_NAME"),
    charset: "utf8mb4",
  });

  const year = 2025;

  // 1. Fee Payments (HISTORICO_PAGOS / HISTORICO_PAGOS_DETALLE)
  // Let's sum by group
  // Mantenimiento ordinario = 13 (or group 2, 4, 5, 7)
  // Let's see what groups are there in the new schema:
  // Ordinary: kind = ORDINARY (legacy id_cat_grupos_cobro: 2 = mantenimiento, 4 = mantenimiento extraordinario? No, let's check legacy mapping)
  // Let's run a query to get sum of all payments by id_cat_grupos_cobro
  const [payments] = await conn.query(
    `SELECT
      d.id_cat_grupos_cobro,
      SUM(d.monto) AS total
    FROM HISTORICO_PAGOS_DETALLE d
    JOIN HISTORICO_PAGOS p ON p.id_historico_pagos = d.id_historico_pagos
    JOIN AREAS_PRIVATIVAS ap ON ap.id_areas_privativas = p.id_areas_privativas
    WHERE YEAR(p.fechaPago) = ?
      AND d.activo = 1
      AND p.id_cat_status_historico_pagos = 1
      AND p.activo = 1
      AND ap.activo = 1
    GROUP BY d.id_cat_grupos_cobro`,
    [year]
  );

  console.log("=== Legacy HISTORICO_PAGOS_DETALLE by group for 2025 ===");
  console.log(payments);

  // 2. Direct Incomes (INGRESOS)
  const [incomes] = await conn.query(
    `SELECT
      i.id_cat_grupos_cobro,
      SUM(i.monto) AS total
    FROM INGRESOS i
    WHERE YEAR(i.fecha) = ?
      AND i.activo = 1
    GROUP BY i.id_cat_grupos_cobro`,
    [year]
  );

  console.log("\n=== Legacy INGRESOS by group for 2025 ===");
  console.log(incomes);

  await conn.end();
}

main().catch(console.error);
