import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { utils, write } from "xlsx";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get("anio");
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return new Response("No active condominium found", { status: 400 });

  const activeConcepts = await prisma.budgetExpenseConcept.findMany({
    where: { condominiumId: condo.id, year, isActive: true },
    orderBy: [
      { budgetGroup: 'asc' },
      { name: 'asc' }
    ]
  });

  const rows = activeConcepts.map(c => [
    c.legacyBudgetConceptId,
    c.name,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 // 12 meses
  ]);

  const headers = [
    "ID Concepto", "Concepto", 
    "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];
  
  rows.unshift(headers);

  const worksheet = utils.aoa_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Plantilla Presupuestos");

  const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename="plantilla_presupuesto_${year}.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
