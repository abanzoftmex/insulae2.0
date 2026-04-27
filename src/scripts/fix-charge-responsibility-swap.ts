/**
 * fix-charge-responsibility-swap.ts
 *
 * PROBLEMA IDENTIFICADO:
 * El backfill-charge-financial-responsibility.ts tenía la lógica invertida:
 *   id_opcion_estado_cuenta = 2 → guardó "COMMERCE"  ← MAL (debería ser OWNER)
 *   id_opcion_estado_cuenta = 1 → guardó "OWNER"      ← MAL (debería ser COMMERCE)
 *
 * El legacy define correctamente:
 *   id_opcion_estado_cuenta = 2 → Propietario → OWNER
 *   id_opcion_estado_cuenta = 1 → Comercio    → COMMERCE
 *
 * SOLUCIÓN: Un solo UPDATE con CASE que hace el swap atómico.
 * No requiere pasos intermedios ni valores temporales.
 *
 * USO:
 *   # Dry run (muestra conteos, no toca datos):
 *   npx ts-node --project tsconfig.json src/scripts/fix-charge-responsibility-swap.ts
 *
 *   # Aplicar:
 *   npx ts-node --project tsconfig.json src/scripts/fix-charge-responsibility-swap.ts --apply
 */
import { PROJECT_SCOPE } from "@/config/project-scope";
import { prisma } from "@/shared/infrastructure/db/prisma";

async function run(): Promise<void> {
  const applyChanges = process.argv.includes("--apply");

  console.log("\n🔄 Fix: Swap de ChargeResponsibility (OWNER ↔ COMMERCE)");
  console.log("=".repeat(60));
  console.log(`Modo: ${applyChanges ? "⚠️  APPLY — SE MODIFICARÁN DATOS" : "DRY RUN"}`);

  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true, slug: true },
  });
  if (!condominium) {
    throw new Error(`No se encontró condominio activo: ${PROJECT_SCOPE.condominiumCode}`);
  }

  console.log(`\nCondominio: ${condominium.slug} (${condominium.id})`);

  // Conteo antes
  const ownerBefore = await prisma.charge.count({
    where: { condominiumId: condominium.id, responsibility: "OWNER" },
  });
  const commerceBefore = await prisma.charge.count({
    where: { condominiumId: condominium.id, responsibility: "COMMERCE" },
  });
  const total = ownerBefore + commerceBefore;

  console.log(`\nEstado ANTES:`);
  console.log(`  OWNER    : ${ownerBefore.toLocaleString()} charges`);
  console.log(`  COMMERCE : ${commerceBefore.toLocaleString()} charges`);
  console.log(`  Total    : ${total.toLocaleString()}`);

  if (!applyChanges) {
    console.log("\n━━━ DRY RUN — no se modificó nada ━━━");
    console.log("Efecto esperado tras el swap:");
    console.log(`  OWNER    : ${commerceBefore.toLocaleString()} (los actuales COMMERCE)`);
    console.log(`  COMMERCE : ${ownerBefore.toLocaleString()} (los actuales OWNER)`);
    console.log("\nEjecuta con --apply para persistir.");
    return;
  }

  // ── UPDATE atómico: CASE swap en una sola sentencia ───────────────────────
  // Un solo UPDATE con CASE no necesita pasos intermedios — Postgres evalúa
  // el CASE del valor ORIGINAL antes de escribir, así que el swap es seguro.
  const condominiumId = condominium.id;
  const updated = await prisma.$executeRaw`
    UPDATE "Charge"
    SET "responsibility" = CASE
      WHEN "responsibility" = 'OWNER'::"ChargeResponsibility"
        THEN 'COMMERCE'::"ChargeResponsibility"
      WHEN "responsibility" = 'COMMERCE'::"ChargeResponsibility"
        THEN 'OWNER'::"ChargeResponsibility"
    END
    WHERE "condominiumId" = ${condominiumId}
      AND "responsibility" IN (
        'OWNER'::"ChargeResponsibility",
        'COMMERCE'::"ChargeResponsibility"
      )
  `;

  console.log(`\n✅ Swap completado. Filas actualizadas: ${updated.toLocaleString()}`);

  // Verificar después
  const ownerAfter = await prisma.charge.count({
    where: { condominiumId: condominium.id, responsibility: "OWNER" },
  });
  const commerceAfter = await prisma.charge.count({
    where: { condominiumId: condominium.id, responsibility: "COMMERCE" },
  });

  console.log(`\nEstado DESPUÉS:`);
  console.log(`  OWNER    : ${ownerAfter.toLocaleString()} (era COMMERCE)`);
  console.log(`  COMMERCE : ${commerceAfter.toLocaleString()} (era OWNER)`);

  const integrityOk = ownerAfter === commerceBefore && commerceAfter === ownerBefore;
  if (integrityOk) {
    console.log("\n🎉 Integridad verificada: los conteos coinciden con el estado inicial invertido.");
    console.log("   Recarga /reporte-cuotas para ver los datos corregidos.");
  } else {
    console.warn("\n⚠️  Los conteos no coinciden exactamente — revisa manualmente.");
  }
}

run()
  .catch((err) => {
    console.error("Error:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
