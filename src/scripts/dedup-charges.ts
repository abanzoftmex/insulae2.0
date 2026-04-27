/**
 * dedup-charges.ts
 *
 * PROBLEMA:
 * El legacy guardaba múltiples versiones del mismo cargo (area+responsabilidad+año+mes)
 * en la tabla PAGOS sin cancelar los anteriores. Durante el ETL, todos se migraron.
 * El resultado: algunos meses tienen hasta 6 charges OPEN para el mismo periodo.
 *
 * REGLA DEL LEGACY:
 * Para cada (privateAreaId, responsibility, periodYear, periodMonth), solo el
 * registro con el legacyId más alto es el válido. Los anteriores deben marcarse CANCELED.
 *
 * CASOS ESPECIALES que se respetan:
 * - Registros sin legacyId (creados en el nuevo sistema) → siempre se mantienen
 * - Registros ya CANCELED o PAID → no se tocan
 * - Si solo hay 1 OPEN/PARTIAL para ese mes → no hay duplicado, no se toca
 *
 * USO:
 *   # Dry run por condominio activo:
 *   npx tsx src/scripts/dedup-charges.ts
 *
 *   # Ver desglose por área:
 *   npx tsx src/scripts/dedup-charges.ts --verbose
 *
 *   # Aplicar:
 *   npx tsx src/scripts/dedup-charges.ts --apply
 */
import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

const APPLY   = process.argv.includes("--apply");
const VERBOSE = process.argv.includes("--verbose");

type ChargeEntry = {
  id: string;
  legacyId: number | null;
  periodMonth: number | null;
  status: string;
};

async function main() {
  console.log("\n🧹 Deduplicación de Charges (misma área+mes+año)");
  console.log("=".repeat(60));
  console.log(`Modo: ${APPLY ? "⚠️  APPLY — SE CANCELARÁN REGISTROS" : "DRY RUN"}`);

  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true, slug: true },
  });
  if (!condominium) throw new Error(`Condominio no encontrado: ${PROJECT_SCOPE.condominiumCode}`);
  console.log(`\nCondominio: ${condominium.slug} (${condominium.id})`);

  const group = await prisma.chargeGroup.findFirst({
    where: { condominiumId: condominium.id, kind: "ORDINARY", isActive: true },
    select: { id: true },
  });
  if (!group) throw new Error("No se encontró ChargeGroup ORDINARY.");

  // Cargar todos los charges OPEN/PARTIAL con legacyId (los del ETL)
  // Agrupamos por (privateAreaId, responsibility, periodYear, periodMonth)
  const charges = await prisma.charge.findMany({
    where: {
      condominiumId: condominium.id,
      chargeGroupId: group.id,
      status: { in: ["OPEN", "PARTIAL"] },
      legacyId: { not: null },
      periodMonth: { not: undefined },
      periodYear:  { not: undefined },
    },
    select: {
      id: true,
      legacyId: true,
      privateAreaId: true,
      responsibility: true,
      periodYear: true,
      periodMonth: true,
      status: true,
    },
  });

  // Agrupar por clave única
  type GroupKey = string;
  const grouped = new Map<GroupKey, ChargeEntry[]>();
  for (const c of charges) {
    const key = `${c.privateAreaId}__${c.responsibility}__${c.periodYear}__${c.periodMonth}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({ id: c.id, legacyId: c.legacyId, periodMonth: c.periodMonth, status: c.status });
  }

  const toCancel: string[] = [];
  let groupsWithDups = 0;
  let areaSetWithDups = new Set<string>();

  for (const [key, entries] of grouped.entries()) {
    if (entries.length <= 1) continue; // único, no hay duplicado

    // Ordenar por legacyId DESC → el primero es el más reciente (válido)
    entries.sort((a, b) => (b.legacyId ?? 0) - (a.legacyId ?? 0));
    const [valid, ...duplicates] = entries;

    if (VERBOSE) {
      const [areaId, resp, year, month] = key.split("__");
      console.log(`  Dup: ${resp} ${year}-${month.padStart(2, "0")} | válido legacyId=${valid.legacyId} | cancelar: ${duplicates.map(d => d.legacyId).join(",")}`);
      areaSetWithDups.add(areaId);
    }

    groupsWithDups++;
    toCancel.push(...duplicates.map(d => d.id));
  }

  console.log(`\nResumen:`);
  console.log(`  Charges OPEN/PARTIAL con legacyId: ${charges.length.toLocaleString()}`);
  console.log(`  Grupos (área+resp+año+mes):         ${grouped.size.toLocaleString()}`);
  console.log(`  Grupos con duplicados:              ${groupsWithDups.toLocaleString()}`);
  console.log(`  Charges a cancelar:                 ${toCancel.length.toLocaleString()}`);

  if (!APPLY) {
    console.log("\n━━━ DRY RUN — no se modificó nada ━━━");
    console.log("Ejecuta con --apply para cancelar los duplicados.");
    return;
  }

  if (toCancel.length === 0) {
    console.log("\n✅ No hay duplicados que cancelar.");
    return;
  }

  // Cancelar en batches de 500
  const BATCH = 500;
  let cancelled = 0;
  for (let i = 0; i < toCancel.length; i += BATCH) {
    const batch = toCancel.slice(i, i + BATCH);
    const result = await prisma.charge.updateMany({
      where: { id: { in: batch } },
      data: { status: "CANCELED" },
    });
    cancelled += result.count;
    process.stdout.write(`\r  Cancelados: ${cancelled}/${toCancel.length}...`);
  }

  console.log(`\n\n✅ Deduplicación completada.`);
  console.log(`   Charges cancelados: ${cancelled.toLocaleString()}`);

  // Verificar resultado
  const remaining = await prisma.charge.count({
    where: {
      condominiumId: condominium.id,
      chargeGroupId: group.id,
      status: { in: ["OPEN", "PARTIAL"] },
    },
  });
  console.log(`   Charges OPEN/PARTIAL restantes: ${remaining.toLocaleString()}`);
  console.log("\n   Recarga /reporte-cuotas para verificar los balances.");
}

main()
  .catch((err) => { console.error("Error:", err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
