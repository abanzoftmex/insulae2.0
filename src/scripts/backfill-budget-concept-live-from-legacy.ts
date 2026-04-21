import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

import { PROJECT_SCOPE } from "@/config/project-scope";
import {
  BUDGET_EXPENSE_GROUP,
  toBudgetExpenseGroupFromLegacyGroupId,
  type BudgetExpenseGroup,
} from "@/shared/domain/budget-expense-group";
import { prisma } from "@/shared/infrastructure/db/prisma";

type LegacyBudgetConceptRow = RowDataPacket & {
  id_cat_conceptos_presupuesto: number;
  id_cat_grupos_presupuesto: number;
  nombre: string | null;
  activo: number;
};

type LegacyBudgetGroupRow = RowDataPacket & {
  id_cat_grupos_presupuesto: number;
  id_cat_grupos_cobro: number | null;
  nombre: string | null;
  anio: number;
};

type LegacyBudgetDetailRow = RowDataPacket & {
  id_presupuesto_detalle: number;
  id_cat_conceptos_presupuesto: number;
  anio: number;
};

type LegacyExpenseRow = RowDataPacket & {
  id_gastos: number;
  id_cat_conceptos_presupuesto: number | null;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function readYearOption(): number {
  const raw = process.argv.find((arg) => arg.startsWith("--year="));
  if (!raw) {
    throw new Error("Debes enviar --year=<anio>");
  }

  const parsed = Number.parseInt(raw.slice("--year=".length), 10);
  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > 2100) {
    throw new Error("El parametro --year debe ser un anio valido");
  }

  return parsed;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveBudgetGroupFromLegacy(
  groupName: string | null,
  chargeGroupId: number | null,
  legacyBudgetGroupId: number,
): BudgetExpenseGroup {
  if ([1, 2, 3, 4, 16].includes(legacyBudgetGroupId)) {
    return toBudgetExpenseGroupFromLegacyGroupId(legacyBudgetGroupId);
  }

  const normalized = normalizeText(groupName);

  if (normalized.includes("administr")) {
    return BUDGET_EXPENSE_GROUP.ADMINISTRATION;
  }

  if (normalized.includes("manten")) {
    return BUDGET_EXPENSE_GROUP.MAINTENANCE;
  }

  if (normalized.includes("segur")) {
    return BUDGET_EXPENSE_GROUP.SECURITY;
  }

  if (normalized.includes("infra")) {
    return BUDGET_EXPENSE_GROUP.INFRASTRUCTURE;
  }

  if (normalized.includes("extraordin") || chargeGroupId === 3) {
    return BUDGET_EXPENSE_GROUP.EXTRAORDINARY;
  }

  return BUDGET_EXPENSE_GROUP.OTHER;
}

async function main(): Promise<void> {
  const year = readYearOption();

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

  const [budgetRows] = await connection.query<RowDataPacket[]>(
    "SELECT id_presupuesto FROM PRESUPUESTO WHERE activo = 1 AND anio = ? ORDER BY id_presupuesto DESC LIMIT 1",
    [year],
  );

  const legacyBudgetId = Number(budgetRows[0]?.id_presupuesto ?? 0);
  if (!Number.isFinite(legacyBudgetId) || legacyBudgetId <= 0) {
    throw new Error(`No se encontro PRESUPUESTO activo para el anio ${year}`);
  }

  const [legacyBudgetGroups] = await connection.query<LegacyBudgetGroupRow[]>(
    "SELECT id_cat_grupos_presupuesto, id_cat_grupos_cobro, nombre, anio FROM CAT_GRUPOS_PRESUPUESTO WHERE anio = ?",
    [year],
  );

  const [legacyBudgetDetails] = await connection.query<LegacyBudgetDetailRow[]>(
    "SELECT id_presupuesto_detalle, id_cat_conceptos_presupuesto, id_cat_grupos_presupuesto, anio FROM PRESUPUESTO_DETALLE WHERE id_presupuesto = ?",
    [legacyBudgetId],
  );

  const [legacyExpenses] = await connection.query<LegacyExpenseRow[]>(
    "SELECT id_gastos, id_cat_conceptos_presupuesto FROM GASTOS WHERE YEAR(fecha) = ?",
    [year],
  );

  const referencedConceptIds = new Set<number>();
  for (const row of legacyBudgetDetails) {
    const conceptId = Number(row.id_cat_conceptos_presupuesto);
    if (Number.isFinite(conceptId)) {
      referencedConceptIds.add(conceptId);
    }
  }
  for (const row of legacyExpenses) {
    const conceptId = Number(row.id_cat_conceptos_presupuesto);
    if (Number.isFinite(conceptId)) {
      referencedConceptIds.add(conceptId);
    }
  }

  const conceptIdList = [...referencedConceptIds.values()].sort((a, b) => a - b);
  const legacyBudgetConcepts: LegacyBudgetConceptRow[] = [];

  if (conceptIdList.length > 0) {
    const placeholders = conceptIdList.map(() => "?").join(", ");
    const [conceptRows] = await connection.query<LegacyBudgetConceptRow[]>(
      `SELECT id_cat_conceptos_presupuesto, id_cat_grupos_presupuesto, nombre, activo FROM CAT_CONCEPTOS_PRESUPUESTO WHERE id_cat_conceptos_presupuesto IN (${placeholders})`,
      conceptIdList,
    );
    legacyBudgetConcepts.push(...conceptRows);
  }

  await connection.end();

  const legacyBudgetGroupById = new Map<number, LegacyBudgetGroupRow>(
    legacyBudgetGroups.map((row) => [Number(row.id_cat_grupos_presupuesto), row]),
  );

  const conceptIdToCanonicalId = new Map<number, string>();
  const detailGroupByConceptId = new Map<number, number>();
  for (const detail of legacyBudgetDetails) {
    const conceptId = Number(detail.id_cat_conceptos_presupuesto);
    const detailGroupId = Number(detail.id_cat_grupos_presupuesto);
    if (!Number.isFinite(conceptId) || !Number.isFinite(detailGroupId)) {
      continue;
    }
    if (!detailGroupByConceptId.has(conceptId)) {
      detailGroupByConceptId.set(conceptId, detailGroupId);
    }
  }

  let upsertedBudgetConcepts = 0;
  let upsertedConceptMaps = 0;

  for (const conceptRow of legacyBudgetConcepts) {
    const legacyConceptId = Number(conceptRow.id_cat_conceptos_presupuesto);
    const fallbackBudgetGroupId = Number(conceptRow.id_cat_grupos_presupuesto);
    const legacyBudgetGroupId =
      detailGroupByConceptId.get(legacyConceptId) ?? fallbackBudgetGroupId;
    const group = legacyBudgetGroupById.get(legacyBudgetGroupId);

    const budgetGroup = resolveBudgetGroupFromLegacy(
      group?.nombre ?? null,
      group?.id_cat_grupos_cobro ?? null,
      legacyBudgetGroupId,
    );

    const conceptName = (conceptRow.nombre ?? "").trim();
    const name = conceptName.length > 0 ? conceptName : `Concepto ${legacyConceptId}`;
    const isActive = Number(conceptRow.activo) === 1;

    const budgetConcept = await prisma.budgetExpenseConcept.upsert({
      where: {
        condominiumId_year_legacyBudgetConceptId: {
          condominiumId: condominium.id,
          year,
          legacyBudgetConceptId: legacyConceptId,
        },
      },
      update: {
        name,
        budgetGroup,
        isActive,
        source: "legacy_live_backfill",
      },
      create: {
        condominiumId: condominium.id,
        year,
        legacyBudgetConceptId: legacyConceptId,
        name,
        budgetGroup,
        isActive,
        source: "legacy_live_backfill",
      },
      select: { id: true },
    });

    conceptIdToCanonicalId.set(legacyConceptId, budgetConcept.id);
    upsertedBudgetConcepts += 1;

    await prisma.expenseConceptGroupMap.upsert({
      where: {
        condominiumId_year_legacyBudgetConceptId: {
          condominiumId: condominium.id,
          year,
          legacyBudgetConceptId: legacyConceptId,
        },
      },
      update: {
        budgetGroupId: legacyBudgetGroupId,
        budgetConceptId: budgetConcept.id,
        isBudgetConceptActive: isActive,
        source: "legacy_live_backfill",
      },
      create: {
        condominiumId: condominium.id,
        year,
        legacyBudgetConceptId: legacyConceptId,
        budgetGroupId: legacyBudgetGroupId,
        budgetConceptId: budgetConcept.id,
        isBudgetConceptActive: isActive,
        source: "legacy_live_backfill",
      },
    });

    upsertedConceptMaps += 1;
  }

  const detailConceptIdByLegacyDetailId = new Map<number, number>(
    legacyBudgetDetails
      .map((row) => [Number(row.id_presupuesto_detalle), Number(row.id_cat_conceptos_presupuesto)] as const)
      .filter((entry) => Number.isFinite(entry[0]) && Number.isFinite(entry[1])),
  );

  const expenseConceptIdByLegacyExpenseId = new Map<number, number>(
    legacyExpenses
      .map((row) => [Number(row.id_gastos), Number(row.id_cat_conceptos_presupuesto)] as const)
      .filter((entry) => Number.isFinite(entry[0]) && Number.isFinite(entry[1])),
  );

  const budgetLines = await prisma.budgetLine.findMany({
    where: {
      budget: {
        condominiumId: condominium.id,
        year,
      },
      legacyId: { not: null },
    },
    select: {
      id: true,
      legacyId: true,
      budgetConceptId: true,
    },
  });

  let budgetLinesUpdated = 0;
  let budgetLinesUnmapped = 0;

  for (const line of budgetLines) {
    const legacyDetailId = Number(line.legacyId);
    const legacyConceptId = detailConceptIdByLegacyDetailId.get(legacyDetailId);

    if (!legacyConceptId) {
      budgetLinesUnmapped += 1;
      continue;
    }

    const canonicalConceptId = conceptIdToCanonicalId.get(legacyConceptId);
    if (!canonicalConceptId) {
      budgetLinesUnmapped += 1;
      continue;
    }

    if (line.budgetConceptId === canonicalConceptId) {
      continue;
    }

    await prisma.budgetLine.update({
      where: { id: line.id },
      data: { budgetConceptId: canonicalConceptId },
    });

    budgetLinesUpdated += 1;
  }

  const expenses = await prisma.expense.findMany({
    where: {
      condominiumId: condominium.id,
      legacyId: { not: null },
      date: {
        gte: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
        lt: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)),
      },
    },
    select: {
      id: true,
      legacyId: true,
      budgetConceptId: true,
      legacyBudgetConceptId: true,
    },
  });

  let expensesUpdated = 0;
  let expensesUnmapped = 0;

  for (const expense of expenses) {
    const legacyExpenseId = Number(expense.legacyId);
    const legacyConceptId = expenseConceptIdByLegacyExpenseId.get(legacyExpenseId);

    if (!legacyConceptId) {
      expensesUnmapped += 1;
      continue;
    }

    const canonicalConceptId = conceptIdToCanonicalId.get(legacyConceptId);
    if (!canonicalConceptId) {
      expensesUnmapped += 1;
      continue;
    }

    if (
      expense.budgetConceptId === canonicalConceptId &&
      expense.legacyBudgetConceptId === legacyConceptId
    ) {
      continue;
    }

    await prisma.expense.update({
      where: { id: expense.id },
      data: {
        budgetConceptId: canonicalConceptId,
        legacyBudgetConceptId: legacyConceptId,
      },
    });

    expensesUpdated += 1;
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        year,
        legacyBudgetId,
        legacyBudgetGroups: legacyBudgetGroups.length,
        legacyBudgetConcepts: legacyBudgetConcepts.length,
        legacyBudgetDetails: legacyBudgetDetails.length,
        legacyExpenses: legacyExpenses.length,
        upsertedBudgetConcepts,
        upsertedConceptMaps,
        budgetLinesReviewed: budgetLines.length,
        budgetLinesUpdated,
        budgetLinesUnmapped,
        expensesReviewed: expenses.length,
        expensesUpdated,
        expensesUnmapped,
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
