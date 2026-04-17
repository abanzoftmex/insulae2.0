import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type Violation = {
  file: string;
  line: number;
  rule: string;
  snippet: string;
};

const RUNTIME_ROOTS = [
  "src/app",
  "src/modules",
  "src/shared",
  "src/config",
] as const;

const EXCLUDED_PREFIXES = ["src/modules/migration/", "src/modules/migration-etl/"] as const;

const RULES: Array<{ name: string; regex: RegExp }> = [
  {
    name: "No runtime references to legacy export files",
    regex: /(data\/legacy-export|docs\/raw-db\/full_dump\.sql|full_dump\.sql)/i,
  },
  {
    name: "No runtime filesystem imports",
    regex:
      /(from\s+["']node:fs(?:\/promises)?["']|from\s+["']fs(?:\/promises)?["']|require\(["']node:fs(?:\/promises)?["']\)|require\(["']fs(?:\/promises)?["']\))/i,
  },
];

const SOURCE_FILE_REGEX = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;

function shouldScan(relativePath: string): boolean {
  if (!SOURCE_FILE_REGEX.test(relativePath)) {
    return false;
  }

  return !EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

async function collectFiles(rootRelativePath: string): Promise<string[]> {
  const rootAbsolutePath = path.resolve(process.cwd(), rootRelativePath);
  const entries = await readdir(rootAbsolutePath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absoluteEntryPath = path.join(rootAbsolutePath, entry.name);
    const relativeEntryPath = path
      .relative(process.cwd(), absoluteEntryPath)
      .split(path.sep)
      .join("/");

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(relativeEntryPath)));
      continue;
    }

    if (entry.isFile() && shouldScan(relativeEntryPath)) {
      files.push(relativeEntryPath);
    }
  }

  return files;
}

async function findViolations(): Promise<Violation[]> {
  const filesByRoot = await Promise.all(RUNTIME_ROOTS.map((root) => collectFiles(root)));
  const files = filesByRoot.flat();
  const violations: Violation[] = [];

  for (const file of files) {
    const absolutePath = path.resolve(process.cwd(), file);
    const contents = await readFile(absolutePath, "utf8");
    const lines = contents.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      for (const rule of RULES) {
        if (!rule.regex.test(line)) {
          continue;
        }

        violations.push({
          file,
          line: index + 1,
          rule: rule.name,
          snippet: line.trim(),
        });
      }
    }
  }

  return violations;
}

async function main(): Promise<void> {
  const violations = await findViolations();

  if (violations.length === 0) {
    console.log("Runtime data boundary check passed: Neon-only runtime data access is enforced.");
    return;
  }

  console.error("Runtime data boundary check failed. Found forbidden patterns:");

  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} | ${violation.rule} | ${violation.snippet}`,
    );
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});