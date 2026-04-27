import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { utils, write } from "xlsx";

export async function GET() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return new Response("No active condominium found", { status: 400 });

  const BUDGET_GROUP_LABELS: Record<string, string> = {
    ADMINISTRATION: "Gastos de administración",
    MAINTENANCE: "Gastos de mantenimiento",
    SERVICES: "Servicios",
    FIXED_FUNDS: "Fondos fijos",
    EXTRAORDINARY: "Cuotas extraordinarias",
  };

  const budgetConcepts = await prisma.budgetExpenseConcept.findMany({
    where: { condominiumId: condo.id, isActive: true },
    orderBy: [{ order: "asc" }, { budgetGroup: "asc" }, { name: "asc" }],
    select: { id: true, legacyBudgetConceptId: true, name: true, budgetGroup: true },
  });

  // Template sheet
  const headers = [
    "ID Concepto (obligatorio)",
    "Fecha (YYYY-MM-DD)",
    "Monto",
    "Forma de Pago (CASH/TRANSFER/CARD/CHECK/OTHER)",
    "Detalles del gasto (Concepto)",
    "Proyecto (opcional)",
    "Observaciones (opcional)",
  ];

  const templateRows = [headers];
  const templateWs = utils.aoa_to_sheet(templateRows);

  // Set column widths
  templateWs["!cols"] = [
    { wch: 38 },
    { wch: 20 },
    { wch: 15 },
    { wch: 45 },
    { wch: 40 },
    { wch: 30 },
    { wch: 40 },
  ];

  // Reference sheet
  const catalogHeaders = ["ID Concepto", "Grupo", "Nombre"];
  const catalogRows = [
    catalogHeaders,
    ...budgetConcepts.map((c) => [c.legacyBudgetConceptId ?? c.id.slice(0, 8), BUDGET_GROUP_LABELS[c.budgetGroup] || c.budgetGroup, c.name]),
  ];
  const catalogWs = utils.aoa_to_sheet(catalogRows);
  catalogWs["!cols"] = [{ wch: 40 }, { wch: 25 }, { wch: 45 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, templateWs, "Plantilla Egresos");
  utils.book_append_sheet(workbook, catalogWs, "Catálogo de Conceptos");

  const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="plantilla_egresos.xlsx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
