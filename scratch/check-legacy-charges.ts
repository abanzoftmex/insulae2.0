import mysql from "mysql2/promise";

async function main() {
  const legacyConn = await mysql.createConnection({
    host: "216.238.67.137",
    user: "sistemasabanza_insulaeValquirico",
    password: "In$uL!ae25!",
    database: "sistemasabanza_insulaeValquirico",
  });

  const [rows] = await legacyConn.query<any[]>(
    `SELECT id_pagos, id_opcion_estado_cuenta, monto, intereses, id_cat_status_pago, activo, fechaPago
     FROM PAGOS
     WHERE id_areas_privativas = 814 AND fechaPago = '2025-01-01'`
  );

  console.log("=== CHARGES FOR JAN 1, 2025 ===");
  for (const r of rows) {
    console.log(`  ID=${r.id_pagos} | opc=${r.id_opcion_estado_cuenta} | monto=${r.monto} | intereses=${r.intereses} | status=${r.id_cat_status_pago} | active=${r.activo}`);
  }

  await legacyConn.end();
}

main().catch(console.error);
