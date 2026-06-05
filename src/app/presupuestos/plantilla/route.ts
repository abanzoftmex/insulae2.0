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
    include: { group: true },
    orderBy: [
      { group: { order: 'asc' } },
      { order: 'asc' },
      { name: 'asc' }
    ]
  });

  const headers = [
    "ID Concepto", "Concepto",
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];

  // Agrupamos los conceptos por identidad de grupo (igual que /presupuestos).
  // Usamos un Map en vez de confiar en el orden de la consulta, porque varios
  // grupos pueden compartir el mismo "order" (0 por defecto) y la BD podría
  // intercalar sus conceptos.
  const groupKeys: string[] = [];
  const groupsMap = new Map<string, { label: string; order: number; concepts: typeof activeConcepts }>();
  for (const c of activeConcepts) {
    const groupKey = c.group?.id || c.budgetGroup || "OTHER";
    if (!groupsMap.has(groupKey)) {
      const name = c.group?.name || c.budgetGroup || "OTHER";
      const subname = c.group?.category && c.group.category !== name ? c.group.category : "";
      const label = subname ? `${name} — ${subname}` : name;
      groupsMap.set(groupKey, { label, order: c.group?.order ?? 0, concepts: [] });
      groupKeys.push(groupKey);
    }
    groupsMap.get(groupKey)!.concepts.push(c);
  }

  // Ordenamos los grupos por su "order"; los empates conservan el orden de
  // aparición (Array.sort es estable). Antes de cada grupo insertamos una fila
  // separadora (columna ID vacía + nombre del grupo en la columna "Concepto")
  // para facilitar el llenado por el personal administrativo. El importador
  // ignora cualquier fila cuya primera columna no sea un ID válido, por lo que
  // esta agrupación NO afecta la importación.
  groupKeys.sort((a, b) => groupsMap.get(a)!.order - groupsMap.get(b)!.order);

  const rows: any[][] = [headers];
  for (const key of groupKeys) {
    const g = groupsMap.get(key)!;
    rows.push(["", `▼ ${g.label}`]);
    for (const c of g.concepts) {
      rows.push([
        c.legacyBudgetConceptId,
        c.name,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 // 12 meses
      ]);
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
