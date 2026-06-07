import mysql from "mysql2/promise";

async function main() {
  const legacyConn = await mysql.createConnection({
    host: "216.238.67.137",
    user: "sistemasabanza_insulaeValquirico",
    password: "In$uL!ae25!",
    database: "sistemasabanza_insulaeValquirico",
  });

  const [tables] = await legacyConn.query<any[]>("SHOW TABLES");
  const tableNames = tables.map(t => Object.values(t)[0] as string);

  console.log("=== SEARCHING FOR FILE/DOCUMENT COLUMNS IN ALL TABLES ===");
  
  for (const table of tableNames) {
    try {
      const [columns] = await legacyConn.query<any[]>(`SHOW COLUMNS FROM \`${table}\``);
      const fileCols = columns.filter(c => {
        const name = c.Field.toLowerCase();
        return name.includes("comprobante") || 
               name.includes("archivo") || 
               name.includes("imagen") || 
               name.includes("documento") || 
               name.includes("file") || 
               name.includes("pdf") ||
               name.includes("doc");
      });

      for (const col of fileCols) {
        const [countRow] = await legacyConn.query<any[]>(
          `SELECT COUNT(*) as count FROM \`${table}\` WHERE \`${col.Field}\` IS NOT NULL AND \`${col.Field}\` != ''`
        );
        const count = countRow[0].count;
        if (count > 0) {
          console.log(`Table: ${table} | Column: ${col.Field} | Non-empty rows: ${count}`);
          const [samples] = await legacyConn.query<any[]>(
            `SELECT \`${col.Field}\` FROM \`${table}\` WHERE \`${col.Field}\` IS NOT NULL AND \`${col.Field}\` != '' LIMIT 3`
          );
          console.log("  Samples:", samples.map(s => s[col.Field]));
        }
      }
    } catch (err: any) {
      console.log(`Error reading table ${table}: ${err.message}`);
    }
  }

  await legacyConn.end();
}

main().catch(console.error);
