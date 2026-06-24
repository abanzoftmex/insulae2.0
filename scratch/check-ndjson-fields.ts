import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const filePath = path.resolve(process.cwd(), "data/legacy-export/AREAS_PRIVATIVAS.ndjson");
  const content = await readFile(filePath, "utf8");
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));

  console.log("Total rows in NDJSON:", rows.length);

  let m2AreaComunCount = 0;
  let m2AreaComunHijosCount = 0;
  let bothCount = 0;

  for (const row of rows) {
    const com = Number(row.m2_area_comun || 0);
    const hijos = Number(row.m2_areaComunHijos || 0);
    if (com > 0) m2AreaComunCount++;
    if (hijos > 0) m2AreaComunHijosCount++;
    if (com > 0 && hijos > 0) bothCount++;
  }

  console.log("Rows with m2_area_comun > 0:", m2AreaComunCount);
  console.log("Rows with m2_areaComunHijos > 0:", m2AreaComunHijosCount);
  console.log("Rows with both > 0:", bothCount);

  const sampleHijos = rows.filter(r => Number(r.m2_areaComunHijos || 0) > 0);
  if (sampleHijos.length > 0) {
    console.log("Sample rows with m2_areaComunHijos > 0:", JSON.stringify(sampleHijos.slice(0, 5), null, 2));
  }
}

main().catch(console.error);
