import mysql from "mysql2/promise";

async function main() {
  const legacyConn = await mysql.createConnection({
    host: "216.238.67.137",
    user: "sistemasabanza_insulaeValquirico",
    password: "In$uL!ae25!",
    database: "sistemasabanza_insulaeValquirico",
  });

  const [columns] = await legacyConn.query<any[]>(
    "SHOW COLUMNS FROM HISTORICO_PAGOS"
  );
  console.log("=== HISTORICO_PAGOS COLUMNS ===");
  console.log(columns.map(c => `${c.Field} (${c.Type})`));

  // If there's any file/comprobante column, let's query it.
  const compCol = columns.find(c => c.Field === "comprobante" || c.Field === "archivo" || c.Field === "comprobante_pago" || c.Field === "documento");
  if (compCol) {
    const colName = compCol.Field;
    const [hasCompRow] = await legacyConn.query<any[]>(
      `SELECT COUNT(*) as count FROM HISTORICO_PAGOS WHERE ${colName} IS NOT NULL AND ${colName} != ''`
    );
    console.log(`HISTORICO_PAGOS with non-empty ${colName}: ${hasCompRow[0].count}`);
  } else {
    console.log("No obvious comprobante column found in HISTORICO_PAGOS");
  }

  await legacyConn.end();
}

main().catch(console.error);
