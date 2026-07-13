import * as fs from "fs";
import * as readline from "readline";

async function main() {
  const filePath = "data/legacy-export/AREAS_PRIVATIVAS.ndjson";
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let totalCount = 0;
  let activeCount = 0;
  let inactiveCount = 0;

  let activeParents = 0;
  let activeChildren = 0;
  let inactiveParents = 0;
  let inactiveChildren = 0;

  let activeFusions = 0;
  let inactiveFusions = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    totalCount++;
    const area = JSON.parse(line);

    // Fields in legacy:
    // id_areas_privativas (int)
    // id_areas_privativas_padre (int)
    // activo (int: 1 = active, 0 = inactive)
    // es_fusion (int: 1 = fusion, 0 = not)
    // nombre (string)

    const isActive = area.activo === 1;
    const isFusion = area.es_fusion === 1;
    const parentId = Number(area.id_areas_privativas_padre);

    if (isActive) {
      activeCount++;
      if (isFusion) {
        activeFusions++;
      } else {
        // Not a fusion
        if (parentId === 0) {
          activeParents++;
        } else {
          activeChildren++;
        }
      }
    } else {
      inactiveCount++;
      if (isFusion) {
        inactiveFusions++;
      } else {
        if (parentId === 0) {
          inactiveParents++;
        } else {
          inactiveChildren++;
        }
      }
    }
  }

  console.log("=== Legacy AREAS_PRIVATIVAS.ndjson Stats ===");
  console.log(`Total records: ${totalCount}`);
  console.log(`Active (activo = 1): ${activeCount}`);
  console.log(`Inactive (activo = 0): ${inactiveCount}`);
  console.log("\n--- Active breakdowns (not fusions) ---");
  console.log(`Active Parents (id_areas_privativas_padre = 0): ${activeParents}`);
  console.log(`Active Children (id_areas_privativas_padre > 0): ${activeChildren}`);
  console.log(`Active Fusions (es_fusion = 1): ${activeFusions}`);

  console.log("\n--- Inactive breakdowns (not fusions) ---");
  console.log(`Inactive Parents (id_areas_privativas_padre = 0): ${inactiveParents}`);
  console.log(`Inactive Children (id_areas_privativas_padre > 0): ${inactiveChildren}`);
  console.log(`Inactive Fusions (es_fusion = 1): ${inactiveFusions}`);
}

main().catch(console.error);
