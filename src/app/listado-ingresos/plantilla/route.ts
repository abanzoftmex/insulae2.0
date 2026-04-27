import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { utils, write } from "xlsx";

export async function GET() {
  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return new Response("No active condominium found", { status: 400 });

  const catalogs = await prisma.miscIncomeCatalog.findMany({
    where: { condominiumId: condo.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const chargeGroups = await prisma.chargeGroup.findMany({
    where: { condominiumId: condo.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true },
  });

  // Template sheet
  const headers = [
    "ID Categoría",
    "ID Tipo de Cuota (opcional)",
    "Fecha (YYYY-MM-DD)",
    "Monto",
    "Forma de Pago (CASH/TRANSFER/CARD/CHECK/OTHER)",
    "Concepto",
    "Notas (opcional)",
  ];

  const templateRows = [headers];
  const templateWs = utils.aoa_to_sheet(templateRows);

  // Set column widths
  templateWs["!cols"] = [
    { wch: 38 },
    { wch: 38 },
    { wch: 20 },
    { wch: 15 },
    { wch: 45 },
    { wch: 30 },
    { wch: 30 },
  ];

  // Catalogs reference sheet
  const catalogHeaders = ["ID Categoría", "Nombre"];
  const catalogRows = [
    catalogHeaders,
    ...catalogs.map((c) => [c.id, c.name]),
  ];
  const catalogWs = utils.aoa_to_sheet(catalogRows);
  catalogWs["!cols"] = [{ wch: 40 }, { wch: 35 }];

  // Charge groups reference sheet
  const groupHeaders = ["ID Tipo de Cuota", "Nombre", "Tipo"];
  const groupRows = [
    groupHeaders,
    ...chargeGroups.map((g) => [g.id, g.name, g.kind]),
  ];
  const groupWs = utils.aoa_to_sheet(groupRows);
  groupWs["!cols"] = [{ wch: 40 }, { wch: 35 }, { wch: 20 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, templateWs, "Plantilla Ingresos");
  utils.book_append_sheet(workbook, catalogWs, "Catálogo Categorías");
  utils.book_append_sheet(workbook, groupWs, "Catálogo Tipos de Cuota");

  const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="plantilla_ingresos.xlsx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
