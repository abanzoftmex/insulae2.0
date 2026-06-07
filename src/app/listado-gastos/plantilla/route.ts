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

  // Template sheet headers matching exactly the provided image
  // A: fecha, B: monto, C: id_concepto, D: id_forma_pago, E: recibo, F: comentarios, G: proyecto
  const headers = [
    "fecha",
    "monto",
    "id_concepto",
    "id_forma_pago",
    "recibo",
    "comentarios",
    "proyecto",
  ];

  // Example row to guide the user
  const exampleRow = [
    "2026-01-15",
    "1500.00",
    "1",
    "2",
    "FAC-001",
    "Descripción detallada del gasto",
    "Mantenimiento General",
  ];

  const templateRows = [headers, exampleRow];
  const templateWs = utils.aoa_to_sheet(templateRows);

  // Set column widths
  templateWs["!cols"] = [
    { wch: 15 }, // fecha
    { wch: 12 }, // monto
    { wch: 15 }, // id_concepto
    { wch: 15 }, // id_forma_pago
    { wch: 20 }, // recibo
    { wch: 45 }, // comentarios
    { wch: 30 }, // proyecto
  ];

  // Reference sheet for concepts
  const catalogHeaders = ["ID Concepto (Legacy ID)", "Grupo", "Nombre"];
  const catalogRows = [
    catalogHeaders,
    ...budgetConcepts.map((c) => [
      c.legacyBudgetConceptId ?? c.id.slice(0, 8), 
      BUDGET_GROUP_LABELS[c.budgetGroup] || c.budgetGroup, 
      c.name
    ]),
  ];
  const catalogWs = utils.aoa_to_sheet(catalogRows);
  catalogWs["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 45 }];

  // Payment methods reference
  const methodHeaders = ["ID Forma Pago", "Descripción"];
  const methodRows = [
    methodHeaders,
    ["1", "N/A (Otro)"],
    ["2", "Efectivo"],
    ["3", "Transferencia"],
    ["4", "Tarjeta"],
    ["5", "Cheque"],
    ["6", "Otro"],
  ];
  const methodWs = utils.aoa_to_sheet(methodRows);
  methodWs["!cols"] = [{ wch: 15 }, { wch: 25 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, templateWs, "Plantilla Gastos");
  utils.book_append_sheet(workbook, catalogWs, "Catálogo Conceptos");
  utils.book_append_sheet(workbook, methodWs, "Formas de Pago");

  const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="plantilla_gastos_valquirico.xlsx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
