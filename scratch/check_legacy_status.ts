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
  try {
    const connection = await mysql.createConnection({
      host: requiredEnv("LEGACY_DB_HOST"),
      port: Number.parseInt(process.env.LEGACY_DB_PORT ?? "3306", 10),
      user: requiredEnv("LEGACY_DB_USER"),
      password: requiredEnv("LEGACY_DB_PASSWORD"),
      database: requiredEnv("LEGACY_DB_NAME"),
      charset: "utf8mb4",
    });

    console.log("Querying groups 16 and 33...");
    const [groups] = await connection.query(
      "SELECT id_cat_grupos_presupuesto, nombre, anio, activo FROM CAT_GRUPOS_PRESUPUESTO WHERE id_cat_grupos_presupuesto IN (16, 33)"
    );
    console.log("Groups in legacy DB:", groups);

    console.log("\nQuerying concepts 122 and 180...");
    const [concepts] = await connection.query(
      "SELECT id_cat_conceptos_presupuesto, id_cat_grupos_presupuesto, nombre, anio, activo FROM CAT_CONCEPTOS_PRESUPUESTO WHERE id_cat_conceptos_presupuesto IN (122, 180)"
    );
    console.log("Concepts in legacy DB:", concepts);

    console.log("\nQuerying PRESUPUESTO_DETALLE for concepts 122 and 180 in 2026...");
    const [details] = await connection.query(
      "SELECT id_presupuesto_detalle, id_presupuesto, id_cat_conceptos_presupuesto, id_cat_grupos_presupuesto, anio, activo FROM PRESUPUESTO_DETALLE WHERE id_cat_conceptos_presupuesto IN (122, 180)"
    );
    console.log("Presupuesto Detalle in legacy DB:", details);

    await connection.end();
  } catch (error) {
    console.error(error);
  }
}

main();
