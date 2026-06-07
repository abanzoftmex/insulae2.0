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

  // Template sheet headers matching legacy:
  // fecha, monto, id_categoria, id_tipo_cuota, id_forma_pago, comentarios
  const headers = [
    "fecha",
    "monto",
    "id_categoria",
    "id_tipo_cuota",
    "id_forma_pago",
    "comentarios",
  ];

  const exampleRows = [
    ["2026-01-15", 5000.0, catalogs[0]?.id || "ID-CATEGORIA-1", "", "1", "Pago de cuota mensual"],
    ["2026-01-20", 3000.5, "", chargeGroups[0]?.id || "ID-GRUPO-COBRO-1", "2", "Ingreso extraordinario"],
  ];

  const templateRows = [headers, ...exampleRows];
  const templateWs = utils.aoa_to_sheet(templateRows);

  // Set column widths
  templateWs["!cols"] = [
    { wch: 15 }, // fecha
    { wch: 12 }, // monto
    { wch: 40 }, // id_categoria
    { wch: 40 }, // id_tipo_cuota
    { wch: 15 }, // id_forma_pago
    { wch: 45 }, // comentarios
  ];

  // Catalogs reference sheet
  const catalogHeaders = ["ID Categoría (id_categoria)", "Nombre"];
  const catalogRows = [
    catalogHeaders,
    ...catalogs.map((c) => [c.id, c.name]),
  ];
  const catalogWs = utils.aoa_to_sheet(catalogRows);
  catalogWs["!cols"] = [{ wch: 40 }, { wch: 35 }];

  // Charge groups reference sheet
  const groupHeaders = ["ID Tipo de Cuota (id_tipo_cuota)", "Nombre", "Tipo"];
  const groupRows = [
    groupHeaders,
    ...chargeGroups.map((g) => [g.id, g.name, g.kind]),
  ];
  const groupWs = utils.aoa_to_sheet(groupRows);
  groupWs["!cols"] = [{ wch: 40 }, { wch: 35 }, { wch: 20 }];

  // Payment methods reference
  const methodHeaders = ["id_forma_pago", "Descripción"];
  const methodRows = [
    methodHeaders,
    ["1", "Efectivo"],
    ["2", "Transferencia"],
    ["3", "Tarjeta"],
    ["4", "Cheque"],
    ["5", "Otro"],
  ];
  const methodWs = utils.aoa_to_sheet(methodRows);
  methodWs["!cols"] = [{ wch: 15 }, { wch: 20 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, templateWs, "Ingresos");
  utils.book_append_sheet(workbook, catalogWs, "Catálogo Categorías");
  utils.book_append_sheet(workbook, groupWs, "Catálogo Tipos de Cuota");
  utils.book_append_sheet(workbook, methodWs, "Formas de Pago");

  const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="plantilla_ingresos.xlsx"`,
      "Content-Type":
        "application/vnd.xmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
