import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { MIGRATION_INCLUDED_TABLES } from "@/config/migration-scope";

interface CliOptions {
  outDir: string;
  batchSize: number;
}

function readOption(name: string, fallback?: string): string | undefined {
  const prefixed = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefixed));
  if (raw) {
    return raw.slice(prefixed.length);
  }
  return fallback;
}

function parseOptions(): CliOptions {
  const outDir = readOption("outDir", "data/legacy-export") ?? "data/legacy-export";
  const batchSize = Number.parseInt(readOption("batchSize", "1000") ?? "1000", 10);

  if (!Number.isFinite(batchSize) || batchSize <= 0) {
    throw new Error("batchSize debe ser un entero mayor a 0");
  }

  return { outDir, batchSize };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function toNdjson(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

async function exportTable(
  connection: mysql.Connection,
  tableName: string,
  outDir: string,
  batchSize: number,
): Promise<void> {
  const [countRows] = await connection.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM \`${tableName}\``,
  );
  const total = Number(countRows[0]?.count ?? 0);

  let offset = 0;
  const chunks: string[] = [];

  while (offset < total) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
      [batchSize, offset],
    );

    chunks.push(toNdjson(rows as unknown as Record<string, unknown>[]));
    offset += rows.length;

    if (rows.length === 0) {
      break;
    }
  }

  writeFileSync(join(outDir, `${tableName}.ndjson`), chunks.join(""), "utf8");
  process.stdout.write(`Exported ${tableName}: ${total} rows\n`);
}

async function main(): Promise<void> {
  const options = parseOptions();

  mkdirSync(options.outDir, { recursive: true });

  const connection = await mysql.createConnection({
    host: requiredEnv("LEGACY_DB_HOST"),
    port: Number.parseInt(process.env.LEGACY_DB_PORT ?? "3306", 10),
    user: requiredEnv("LEGACY_DB_USER"),
    password: requiredEnv("LEGACY_DB_PASSWORD"),
    database: requiredEnv("LEGACY_DB_NAME"),
    charset: "utf8mb4",
  });

  try {
    for (const tableName of MIGRATION_INCLUDED_TABLES) {
      await exportTable(connection, tableName, options.outDir, options.batchSize);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Legacy export failed: ${String(error)}\n`);
  process.exit(1);
});
