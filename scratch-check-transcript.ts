import { readFile } from "node:fs/promises";

async function main() {
  const transcriptPath = "/Users/gabrielhernandez/.gemini/antigravity-ide/brain/548ff293-3297-4e62-b67f-8905373a4b12/.system_generated/logs/transcript.jsonl";
  const content = await readFile(transcriptPath, "utf8");
  const lines = content.split("\n");

  console.log("=== SEARCHING TRANSCRIPT ===");
  for (const line of lines) {
    if (line.includes("Otros Ingresos Ordinarios") || line.includes("resumen-financiero") || line.includes("1,557,103")) {
      console.log(line.slice(0, 300));
    }
  }
}

main().catch(console.error);
