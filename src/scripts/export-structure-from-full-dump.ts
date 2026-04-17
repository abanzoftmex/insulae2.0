import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type TableName = "CAT_GRUPO_PUESTOS" | "CAT_PUESTOS" | "DIRECTORIO_HAS_CAT_PUESTOS";

const TABLE_COLUMNS: Record<TableName, string[]> = {
  CAT_GRUPO_PUESTOS: ["id_cat_grupo_puestos", "nombre", "activo", "posicion", "tipo"],
  CAT_PUESTOS: ["id_cat_puestos", "id_cat_grupo_puestos", "nombre", "activo", "cantidad", "suplente"],
  DIRECTORIO_HAS_CAT_PUESTOS: [
    "id_directorio_has_cat_puestos",
    "id_directorio",
    "id_cat_puestos",
    "activo",
    "suplente",
  ],
};

interface CliOptions {
  dumpFile: string;
  outDir: string;
}

function readOption(name: string, fallback: string): string {
  const prefixed = `--${name}=`;
  const option = process.argv.find((arg) => arg.startsWith(prefixed));
  return option ? option.slice(prefixed.length) : fallback;
}

function parseOptions(): CliOptions {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultDumpFile = path.resolve(scriptDir, "../../docs/raw-db/full_dump.sql");
  const defaultOutDir = path.resolve(scriptDir, "../../data/legacy-export-structure");

  return {
    dumpFile: readOption("dumpFile", defaultDumpFile),
    outDir: readOption("outDir", defaultOutDir),
  };
}

function splitSqlTuples(valuesSegment: string): string[] {
  const tuples: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (let index = 0; index < valuesSegment.length; index += 1) {
    const char = valuesSegment[index];

    if (inString) {
      if (char === "\\" && index + 1 < valuesSegment.length) {
        if (depth > 0) {
          current += char;
          current += valuesSegment[index + 1];
        }
        index += 1;
        continue;
      }

      if (char === "'") {
        inString = false;
      }

      if (depth > 0) {
        current += char;
      }
      continue;
    }

    if (char === "'") {
      inString = true;
      if (depth > 0) {
        current += char;
      }
      continue;
    }

    if (char === "(") {
      depth += 1;
      if (depth === 1) {
        current = "";
        continue;
      }
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        tuples.push(current);
        current = "";
        continue;
      }
    }

    if (depth > 0) {
      current += char;
    }
  }

  return tuples;
}

function parseUnquotedToken(raw: string): unknown {
  const normalized = raw.trim();

  if (normalized.length === 0) {
    return "";
  }

  if (normalized.toUpperCase() === "NULL") {
    return null;
  }

  if (/^-?\d+$/.test(normalized)) {
    const parsedInt = Number.parseInt(normalized, 10);
    if (Number.isFinite(parsedInt)) {
      return parsedInt;
    }
  }

  if (/^-?\d+\.\d+$/.test(normalized)) {
    const parsedFloat = Number.parseFloat(normalized);
    if (Number.isFinite(parsedFloat)) {
      return parsedFloat;
    }
  }

  return normalized;
}

function parseTupleFields(tupleContent: string): unknown[] {
  const fields: unknown[] = [];
  let token = "";
  let inString = false;
  let tokenQuoted = false;

  for (let index = 0; index < tupleContent.length; index += 1) {
    const char = tupleContent[index];

    if (inString) {
      if (char === "\\" && index + 1 < tupleContent.length) {
        token += tupleContent[index + 1];
        index += 1;
        continue;
      }

      if (char === "'") {
        inString = false;
        continue;
      }

      token += char;
      continue;
    }

    if (char === "'") {
      inString = true;
      tokenQuoted = true;
      continue;
    }

    if (char === ",") {
      fields.push(tokenQuoted ? token : parseUnquotedToken(token));
      token = "";
      tokenQuoted = false;
      continue;
    }

    token += char;
  }

  fields.push(tokenQuoted ? token : parseUnquotedToken(token));
  return fields;
}

function extractInsertValues(sqlDump: string, tableName: TableName): string {
  const escapedName = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`INSERT INTO \`${escapedName}\` VALUES ([\\s\\S]*?);`);
  const match = sqlDump.match(pattern);

  if (!match || !match[1]) {
    throw new Error(`No se encontro INSERT INTO para ${tableName} en el dump`);
  }

  return match[1];
}

function toNdjson(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }

  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

function parseRowsFromDump(sqlDump: string, tableName: TableName): Record<string, unknown>[] {
  const columns = TABLE_COLUMNS[tableName];
  const valuesSegment = extractInsertValues(sqlDump, tableName);

  return splitSqlTuples(valuesSegment).map((tuple) => {
    const values = parseTupleFields(tuple);
    if (values.length !== columns.length) {
      throw new Error(
        `Tuple invalido en ${tableName}. Esperado=${columns.length}, encontrado=${values.length}.`,
      );
    }

    const row: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i += 1) {
      row[columns[i]] = values[i];
    }
    return row;
  });
}

async function main(): Promise<void> {
  const options = parseOptions();
  const sqlDump = await readFile(options.dumpFile, "utf8");

  await mkdir(options.outDir, { recursive: true });

  const tables = Object.keys(TABLE_COLUMNS) as TableName[];
  for (const tableName of tables) {
    const rows = parseRowsFromDump(sqlDump, tableName);
    const outPath = path.join(options.outDir, `${tableName}.ndjson`);
    await writeFile(outPath, toNdjson(rows), "utf8");
    process.stdout.write(`Exported ${tableName}: ${rows.length} rows -> ${outPath}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`Export failed: ${String(error)}\n`);
  process.exit(1);
});