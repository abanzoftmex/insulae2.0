import { NextResponse } from "next/server";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { getBudgetByYearUseCase } from "@/modules/budget";
import { utils, write } from "xlsx";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get("anio");
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

  const condo = await prisma.condominium.findFirst({ where: { isActive: true } });
  if (!condo) return new Response("No active condominium found", { status: 400 });

  // Usamos exactamente el mismo caso de uso que la página /presupuestos.
  const vm = await getBudgetByYearUseCase.execute(condo.id, year);

  const headers = [
    "ID Concepto", "Concepto", "Costo Unitario", "Proveedor",
    "Ene Presupuesto", "Ene Unidades",
    "Feb Presupuesto", "Feb Unidades",
    "Mar Presupuesto", "Mar Unidades",
    "Abr Presupuesto", "Abr Unidades",
    "May Presupuesto", "May Unidades",
    "Jun Presupuesto", "Jun Unidades",
    "Jul Presupuesto", "Jul Unidades",
    "Ago Presupuesto", "Ago Unidades",
    "Sep Presupuesto", "Sep Unidades",
    "Oct Presupuesto", "Oct Unidades",
    "Nov Presupuesto", "Nov Unidades",
    "Dic Presupuesto", "Dic Unidades"
  ];

  const rows: any[][] = [headers];

  for (const group of vm.groups) {
    // Fila separadora con el nombre completo del grupo (nombre + subnombre si existe)
    const groupLabel = group.groupSubname
      ? `${group.groupData} — ${group.groupSubname}`
      : group.groupData;
    rows.push(["", `▼ ${groupLabel}`]);

    for (const concept of group.concepts) {
      const row: any[] = [
        concept.conceptId,
        concept.conceptName,
        concept.unitCost ?? 0,
        concept.supplierUrl ?? ""
      ];
      for (let m = 1; m <= 12; m++) {
        const mVM = concept.months.find(x => x.month === m);
        row.push(mVM?.budgeted ?? 0);
        row.push(mVM?.units ?? 0);
      }
      rows.push(row);
    }
  }

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
