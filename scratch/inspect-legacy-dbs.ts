import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection({
    host: "216.238.67.137",
    user: "sistemasabanza_insulae",
    password: "In$uL!ae34",
    database: "sistemasabanza_insulae",
  });

  const [reinos] = await connection.query<any[]>(
    "SELECT id_reinos, nombre, bd, activo FROM REINOS"
  );
  console.log("=== REINOS IN LEGACY ===");
  console.log(reinos);

  for (const r of reinos) {
    if (r.activo) {
      try {
        let pass = "";
        if (r.bd === "sistemasabanza_insulaeValquirico") {
          pass = "In$uL!ae25!";
        } else if (r.bd === "sistemasabanza_insulaeSassi") {
          pass = "mJ[@!zsyH6lI";
        } else if (r.bd === "sistemasabanza_insulaeAbanzoft") {
          pass = "!5XHFdt@02aP";
        } else {
          pass = "In$uL!ae34";
        }

        const dbConn = await mysql.createConnection({
          host: "216.238.67.137",
          user: r.bd,
          password: pass,
          database: r.bd,
        });

        const [countRow] = await dbConn.query<any[]>("SELECT COUNT(*) as count FROM GASTOS");
        const [hasCompRow] = await dbConn.query<any[]>("SELECT COUNT(*) as count FROM GASTOS WHERE comprobante IS NOT NULL AND comprobante != ''");
        
        console.log(`Kingdom: ${r.nombre} | Database: ${r.bd} | Total Gastos: ${countRow[0].count} | With Comprobante: ${hasCompRow[0].count}`);
        
        if (hasCompRow[0].count > 0) {
          const [sample] = await dbConn.query<any[]>("SELECT id_gastos, comprobante, recibo FROM GASTOS WHERE comprobante IS NOT NULL AND comprobante != '' LIMIT 5");
          console.log("  Samples:", sample);
        }

        await dbConn.end();
      } catch (err: any) {
        console.log(`Failed to connect/query database ${r.bd}: ${err.message}`);
      }
    }
  }

  await connection.end();
}

main().catch(console.error);
