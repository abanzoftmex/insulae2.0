require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const condRes = await client.query(`
    SELECT id, name, slug FROM "Condominium" WHERE "isActive" = true ORDER BY "updatedAt" DESC LIMIT 1
  `);
  console.log("Condominium in insulae2.0 db:", condRes.rows[0]);

  if (condRes.rows[0]) {
    const projRes = await client.query(`
      SELECT id, name, "totalM2", "privateAreasM2", "commonAreasM2" FROM "Project" 
      WHERE "condominiumId" = $1 AND "isActive" = true LIMIT 1
    `, [condRes.rows[0].id]);
    console.log("Project in insulae2.0 db:", projRes.rows[0]);
  }

  await client.end();
}

main().catch(console.error);
