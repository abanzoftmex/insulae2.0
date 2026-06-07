import mysql from "mysql2/promise";

async function main() {
  const legacyConn = await mysql.createConnection({
    host: "216.238.67.137",
    user: "sistemasabanza_insulaeValquirico",
    password: "In$uL!ae25!",
    database: "sistemasabanza_insulaeValquirico",
  });

  const [totalRows] = await legacyConn.query<any[]>(
    "SELECT COUNT(*) as count FROM GASTOS"
  );
  console.log(`Total rows in GASTOS: ${totalRows[0].count}`);

  const [nullComprobante] = await legacyConn.query<any[]>(
    "SELECT COUNT(*) as count FROM GASTOS WHERE comprobante IS NULL"
  );
  console.log(`Rows with NULL comprobante: ${nullComprobante[0].count}`);

  const [emptyComprobante] = await legacyConn.query<any[]>(
    "SELECT COUNT(*) as count FROM GASTOS WHERE comprobante = ''"
  );
  console.log(`Rows with empty string comprobante: ${emptyComprobante[0].count}`);

  const [someRows] = await legacyConn.query<any[]>(
    "SELECT id_gastos, comprobante, recibo FROM GASTOS WHERE comprobante IS NOT NULL AND comprobante != '' LIMIT 10"
  );
  console.log("Some rows with comprobante:", someRows);

  await legacyConn.end();
}

main().catch(console.error);
