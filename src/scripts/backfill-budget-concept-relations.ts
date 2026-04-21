import { PROJECT_SCOPE } from "@/config/project-scope";
import {
  BUDGET_EXPENSE_GROUP,
  toBudgetExpenseGroupFromLegacyGroupId,
} from "@/shared/domain/budget-expense-group";
import { prisma } from "@/shared/infrastructure/db/prisma";

function parseLegacyConceptIdFromLabel(value: string): number | null {
  const match = /\bconcepto\s+(\d+)\b/i.exec(value);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferBudgetGroupIdFromProjectName(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("admin")) {
    return 1;
  }

  if (normalized.includes("manten")) {
    return 2;
  }

  if (normalized.includes("segur")) {
    return 3;
  }

  if (normalized.includes("infra")) {
    return 4;
  }

  if (normalized.includes("extra")) {
    return 16;
  }

  return null;
}

async function main(): Promise<void> {
  const condominium =
    (await prisma.condominium.findFirst({
      where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
      select: { id: true, slug: true, name: true },
    })) ??
    (await prisma.condominium.findFirst({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
    }));

  if (!condominium) {
    throw new Error("No se encontro condominio activo para backfill de conceptos canonicos");
  }

  const conceptMappings = await prisma.expenseConceptGroupMap.findMany({
    where: {
      condominiumId: condominium.id,
      budgetConceptId: { not: null },
    },
    select: {
      year: true,
      legacyBudgetConceptId: true,
      budgetGroupId: true,
      isBudgetConceptActive: true,
      budgetConceptId: true,
      budgetConcept: {
        select: {
          name: true,
        },
      },
    },
  });

  const budgetConceptIdByYearAndLegacy = new Map<string, string>();
  const mappingsByLegacyConceptId = new Map<
    number,
    Array<{
      year: number;
      budgetGroupId: number;
      isBudgetConceptActive: boolean;
      conceptName: string;
    }>
  >();

  for (const mapping of conceptMappings) {
    if (!mapping.budgetConceptId) {
      continue;
    }

    budgetConceptIdByYearAndLegacy.set(
      `${mapping.year}:${mapping.legacyBudgetConceptId}`,
      mapping.budgetConceptId,
    );

    const entries = mappingsByLegacyConceptId.get(mapping.legacyBudgetConceptId) ?? [];
    entries.push({
      year: mapping.year,
      budgetGroupId: mapping.budgetGroupId,
      isBudgetConceptActive: mapping.isBudgetConceptActive,
      conceptName: mapping.budgetConcept?.name ?? `Concepto ${mapping.legacyBudgetConceptId}`,
    });
    mappingsByLegacyConceptId.set(mapping.legacyBudgetConceptId, entries);
  }

  const upsertCanonicalMapping = async (
    year: number,
    legacyConceptId: number,
    inferredGroupId: number | null,
    hasExpensesForKey: boolean,
  ): Promise<string> => {
    const candidates = mappingsByLegacyConceptId.get(legacyConceptId) ?? [];
    const nearest = [...candidates].sort(
      (left, right) => Math.abs(left.year - year) - Math.abs(right.year - year),
    )[0];

    const inferredBudgetGroupId = inferredGroupId ?? nearest?.budgetGroupId ?? 0;
    const inferredIsActive = hasExpensesForKey || nearest?.isBudgetConceptActive || false;
    const inferredName = nearest?.conceptName ?? `Concepto ${legacyConceptId}`;

    const budgetConcept = await prisma.budgetExpenseConcept.upsert({
      where: {
        condominiumId_year_legacyBudgetConceptId: {
          condominiumId: condominium.id,
          year,
          legacyBudgetConceptId: legacyConceptId,
        },
      },
      update: {
        name: inferredName,
        budgetGroup:
          inferredBudgetGroupId > 0
            ? toBudgetExpenseGroupFromLegacyGroupId(inferredBudgetGroupId)
            : BUDGET_EXPENSE_GROUP.OTHER,
        isActive: inferredIsActive,
        source: "legacy_etl",
      },
      create: {
        condominiumId: condominium.id,
        year,
        legacyBudgetConceptId: legacyConceptId,
        name: inferredName,
        budgetGroup:
          inferredBudgetGroupId > 0
            ? toBudgetExpenseGroupFromLegacyGroupId(inferredBudgetGroupId)
            : BUDGET_EXPENSE_GROUP.OTHER,
        isActive: inferredIsActive,
        source: "legacy_etl",
      },
      select: { id: true },
    });

    await prisma.expenseConceptGroupMap.upsert({
      where: {
        condominiumId_year_legacyBudgetConceptId: {
          condominiumId: condominium.id,
          year,
          legacyBudgetConceptId: legacyConceptId,
        },
      },
      update: {
        budgetGroupId: inferredBudgetGroupId,
        budgetConceptId: budgetConcept.id,
        isBudgetConceptActive: inferredIsActive,
        source: "legacy_etl",
      },
      create: {
        condominiumId: condominium.id,
        year,
        legacyBudgetConceptId: legacyConceptId,
        budgetGroupId: inferredBudgetGroupId,
        budgetConceptId: budgetConcept.id,
        isBudgetConceptActive: inferredIsActive,
        source: "legacy_etl",
      },
    });

    const entries = mappingsByLegacyConceptId.get(legacyConceptId) ?? [];
    entries.push({
      year,
      budgetGroupId: inferredBudgetGroupId,
      isBudgetConceptActive: inferredIsActive,
      conceptName: inferredName,
    });
    mappingsByLegacyConceptId.set(legacyConceptId, entries);

    budgetConceptIdByYearAndLegacy.set(`${year}:${legacyConceptId}`, budgetConcept.id);
    return budgetConcept.id;
  };

  const expensesToLink = await prisma.expense.findMany({
    where: {
      condominiumId: condominium.id,
      budgetConceptId: null,
      legacyBudgetConceptId: { not: null },
    },
    select: {
      id: true,
      date: true,
      legacyBudgetConceptId: true,
      legacyProjectName: true,
    },
  });

  const expensesWithLegacyConcept = await prisma.expense.findMany({
    where: {
      condominiumId: condominium.id,
      legacyBudgetConceptId: { not: null },
    },
    select: {
      date: true,
      legacyBudgetConceptId: true,
      legacyProjectName: true,
    },
  });

  const inferredGroupIdByMappingKey = new Map<string, number>();
  for (const expense of expensesWithLegacyConcept) {
    if (expense.legacyBudgetConceptId === null) {
      continue;
    }

    const mappingKey = `${expense.date.getUTCFullYear()}:${expense.legacyBudgetConceptId}`;
    if (inferredGroupIdByMappingKey.has(mappingKey)) {
      continue;
    }

    const inferredGroupId = inferBudgetGroupIdFromProjectName(expense.legacyProjectName);
    if (inferredGroupId !== null) {
      inferredGroupIdByMappingKey.set(mappingKey, inferredGroupId);
    }
  }

  for (const [mappingKey, inferredGroupId] of inferredGroupIdByMappingKey.entries()) {
    const [yearRaw, conceptRaw] = mappingKey.split(":");
    const year = Number.parseInt(yearRaw, 10);
    const legacyConceptId = Number.parseInt(conceptRaw, 10);

    if (!Number.isFinite(year) || !Number.isFinite(legacyConceptId)) {
      continue;
    }

    const currentMapping = await prisma.expenseConceptGroupMap.findUnique({
      where: {
        condominiumId_year_legacyBudgetConceptId: {
          condominiumId: condominium.id,
          year,
          legacyBudgetConceptId: legacyConceptId,
        },
      },
      select: {
        budgetGroupId: true,
        isBudgetConceptActive: true,
        budgetConceptId: true,
      },
    });

    if (!currentMapping?.budgetConceptId) {
      continue;
    }

    if (
      currentMapping.budgetGroupId === inferredGroupId &&
      currentMapping.isBudgetConceptActive
    ) {
      continue;
    }

    await prisma.expenseConceptGroupMap.update({
      where: {
        condominiumId_year_legacyBudgetConceptId: {
          condominiumId: condominium.id,
          year,
          legacyBudgetConceptId: legacyConceptId,
        },
      },
      data: {
        budgetGroupId: inferredGroupId,
        isBudgetConceptActive: true,
        source: "legacy_etl",
      },
    });

    await prisma.budgetExpenseConcept.update({
      where: { id: currentMapping.budgetConceptId },
      data: {
        budgetGroup: toBudgetExpenseGroupFromLegacyGroupId(inferredGroupId),
        isActive: true,
        source: "legacy_etl",
      },
    });
  }

  let expensesLinked = 0;
  const missingExpenseMappings = new Set<string>();

  for (const expense of expensesToLink) {
    if (expense.legacyBudgetConceptId === null) {
      continue;
    }

    const year = expense.date.getUTCFullYear();
    const mappingKey = `${year}:${expense.legacyBudgetConceptId}`;
    const budgetConceptId = budgetConceptIdByYearAndLegacy.get(mappingKey) ?? null;

    if (!budgetConceptId) {
      missingExpenseMappings.add(mappingKey);
      continue;
    }

    await prisma.expense.update({
      where: { id: expense.id },
      data: { budgetConceptId },
    });

    expensesLinked += 1;
  }

  const budgetLinesToLink = await prisma.budgetLine.findMany({
    where: {
      budget: {
        condominiumId: condominium.id,
      },
      budgetConceptId: null,
    },
    select: {
      id: true,
      concept: true,
      budget: {
        select: {
          year: true,
        },
      },
    },
  });

  let budgetLinesLinked = 0;
  let skippedBudgetLinesWithoutConceptId = 0;
  const missingBudgetLineMappings = new Set<string>();

  for (const budgetLine of budgetLinesToLink) {
    const legacyConceptId = parseLegacyConceptIdFromLabel(budgetLine.concept);
    if (legacyConceptId === null) {
      skippedBudgetLinesWithoutConceptId += 1;
      continue;
    }

    const mappingKey = `${budgetLine.budget.year}:${legacyConceptId}`;
    const budgetConceptId = budgetConceptIdByYearAndLegacy.get(mappingKey) ?? null;

    if (!budgetConceptId) {
      missingBudgetLineMappings.add(mappingKey);
      continue;
    }

    await prisma.budgetLine.update({
      where: { id: budgetLine.id },
      data: { budgetConceptId },
    });

    budgetLinesLinked += 1;
  }

  const unresolvedMappings = [
    ...missingExpenseMappings,
    ...missingBudgetLineMappings,
  ];

  const autoFilledMappings = new Set<string>();

  for (const mappingKey of unresolvedMappings) {
    const [yearRaw, conceptRaw] = mappingKey.split(":");
    const year = Number.parseInt(yearRaw, 10);
    const legacyConceptId = Number.parseInt(conceptRaw, 10);

    if (!Number.isFinite(year) || !Number.isFinite(legacyConceptId)) {
      continue;
    }

    await upsertCanonicalMapping(
      year,
      legacyConceptId,
      inferredGroupIdByMappingKey.get(mappingKey) ?? null,
      expensesWithLegacyConcept.some(
        (expense) =>
          expense.legacyBudgetConceptId !== null &&
          `${expense.date.getUTCFullYear()}:${expense.legacyBudgetConceptId}` === mappingKey,
      ),
    );
    autoFilledMappings.add(mappingKey);
  }

  for (const expense of expensesToLink) {
    if (expense.legacyBudgetConceptId === null) {
      continue;
    }

    const year = expense.date.getUTCFullYear();
    const mappingKey = `${year}:${expense.legacyBudgetConceptId}`;
    const budgetConceptId = budgetConceptIdByYearAndLegacy.get(mappingKey) ?? null;

    if (!budgetConceptId) {
      continue;
    }

    await prisma.expense.update({
      where: { id: expense.id },
      data: { budgetConceptId },
    });
  }

  for (const budgetLine of budgetLinesToLink) {
    const legacyConceptId = parseLegacyConceptIdFromLabel(budgetLine.concept);
    if (legacyConceptId === null) {
      continue;
    }

    const mappingKey = `${budgetLine.budget.year}:${legacyConceptId}`;
    const budgetConceptId = budgetConceptIdByYearAndLegacy.get(mappingKey) ?? null;

    if (!budgetConceptId) {
      continue;
    }

    await prisma.budgetLine.update({
      where: { id: budgetLine.id },
      data: { budgetConceptId },
    });
  }

  const unresolvedAfterAutofill = [
    ...missingExpenseMappings,
    ...missingBudgetLineMappings,
  ].filter((mappingKey) => !budgetConceptIdByYearAndLegacy.has(mappingKey));

  if (unresolvedAfterAutofill.length > 0) {
    const preview = unresolvedAfterAutofill.slice(0, 25);
    throw new Error(
      `Hay huecos en el mapping canonico por anio/concepto (${unresolvedAfterAutofill.length}). Muestras: ${preview.join(", ")}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        condominium: condominium.slug,
        condominiumName: condominium.name,
        conceptMappings: conceptMappings.length,
        expensesReviewed: expensesToLink.length,
        expensesLinked,
        budgetLinesReviewed: budgetLinesToLink.length,
        budgetLinesLinked,
        skippedBudgetLinesWithoutConceptId,
        autoFilledMappings: [...autoFilledMappings],
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
