import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../shared/infrastructure/db/prisma";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const conceptsPath = path.resolve(__dirname, "../../data/legacy-export-structure/CAT_CONCEPTOS_PRESUPUESTO.ndjson");
  const conceptsRaw = await readFile(conceptsPath, "utf8");
  const concepts = conceptsRaw.trim().split("\n").map(line => JSON.parse(line));

  console.log(`Leídos ${concepts.length} conceptos de legacy.`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < concepts.length; i++) {
    const legacy = concepts[i];
    if (i % 50 === 0) console.log(`Procesando ${i}/${concepts.length}...`);
    
    const res = await prisma.budgetExpenseConcept.updateMany({
      where: {
        legacyBudgetConceptId: legacy.id_cat_conceptos_presupuesto,
        year: legacy.anio
      },
      data: {
        order: legacy.orden || 0
      }
    });

    if (res.count > 0) {
      updated += res.count;
    } else {
      skipped++;
    }
  }

  console.log(`Backfill completado: ${updated} conceptos actualizados, ${skipped} no encontrados en Neon.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
