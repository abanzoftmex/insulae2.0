import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyConceptRow = RowDataPacket & {
  anio: number;
  id_cat_conceptos_presupuesto: number;
  activo: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function readYearOption(): number | null {
  const raw = process.argv.find((arg) => arg.startsWith("--year="));
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw.slice("--year=".length), 10);
  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > 2100) {
    throw new Error("El parametro --year debe ser un anio valido");
  }

  return parsed;
}

async function main(): Promise<void> {
  const yearFilter = readYearOption();

  const condominium =
    (await prisma.condominium.findFirst({
      where: {
        slug: PROJECT_SCOPE.condominiumCode,
        isActive: true,
      },
      select: { id: true, slug: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true, slug: true },
    }));

  if (!condominium) {
    throw new Error("No se encontro condominio activo para backfill de conceptos de presupuesto");
  }

  const connection = await mysql.createConnection({
    host: requiredEnv("LEGACY_DB_HOST"),
    port: Number.parseInt(process.env.LEGACY_DB_PORT ?? "3306", 10),
    user: requiredEnv("LEGACY_DB_USER"),
    password: requiredEnv("LEGACY_DB_PASSWORD"),
    database: requiredEnv("LEGACY_DB_NAME"),
    charset: "utf8mb4",
  });

  const whereSql = yearFilter === null ? "" : " WHERE anio = ?";
  const params = yearFilter === null ? [] : [yearFilter];

  const [rows] = await connection.query<LegacyConceptRow[]>(
    `SELECT anio, id_cat_conceptos_presupuesto, activo FROM CAT_CONCEPTOS_PRESUPUESTO${whereSql}`,
    params,
  );

  await connection.end();

  let budgetConceptRowsTouched = 0;
  let expenseMapRowsTouched = 0;
  let conceptsMatched = 0;

  for (const row of rows) {
    const year = Number(row.anio);
    const legacyConceptId = Number(row.id_cat_conceptos_presupuesto);
    const isActive = Number(row.activo) === 1;

    if (!Number.isFinite(year) || !Number.isFinite(legacyConceptId)) {
      continue;
    }

    const budgetConceptResult = await prisma.budgetExpenseConcept.updateMany({
      where: {
        condominiumId: condominium.id,
        year,
        legacyBudgetConceptId: legacyConceptId,
      },
      data: {
        isActive,
      },
    });

    const expenseMapResult = await prisma.expenseConceptGroupMap.updateMany({
      where: {
        condominiumId: condominium.id,
        year,
        legacyBudgetConceptId: legacyConceptId,
      },
      data: {
        isBudgetConceptActive: isActive,
      },
    });

    if (budgetConceptResult.count > 0 || expenseMapResult.count > 0) {
      conceptsMatched += 1;
    }

    budgetConceptRowsTouched += budgetConceptResult.count;
    expenseMapRowsTouched += expenseMapResult.count;
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        yearFilter,
        legacyConceptRows: rows.length,
        conceptsMatched,
        budgetConceptRowsTouched,
        expenseMapRowsTouched,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
