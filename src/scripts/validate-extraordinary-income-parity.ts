import mysql from "mysql2/promise";

import { getFinancialSummaryUseCase } from "@/modules/financial-summary";

type LegacyMonthlyRow = {
  month: number;
  total: number;
};

type RuntimeYearSlice = {
  year: number;
  months: number[];
  annualTotal: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function createZeroSeries(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function sumSeries(seriesList: number[][]): number[] {
  const output = createZeroSeries();

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    output[monthIndex] = seriesList.reduce(
      (acc, series) => acc + (series[monthIndex] ?? 0),
      0,
    );
  }

  return output;
}

function annualTotal(series: number[]): number {
  return series.reduce((acc, value) => acc + value, 0);
}

async function loadLegacySeriesForGroup(
  conn: mysql.Connection,
  year: number,
  groupId: number,
): Promise<number[]> {
  const output = createZeroSeries();

  const [paymentRowsRaw] = await conn.query(
    `SELECT
      MONTH(p.fechaPago) AS month,
      COALESCE(SUM(d.monto), 0) AS total
    FROM HISTORICO_PAGOS_DETALLE d
    JOIN HISTORICO_PAGOS p
      ON p.id_historico_pagos = d.id_historico_pagos
    JOIN AREAS_PRIVATIVAS ap
      ON ap.id_areas_privativas = p.id_areas_privativas
    WHERE YEAR(p.fechaPago) = ?
      AND d.id_cat_grupos_cobro = ?
      AND d.activo = 1
      AND p.id_cat_status_historico_pagos = 1
      AND p.activo = 1
      AND ap.activo = 1
    GROUP BY MONTH(p.fechaPago)`,
    [year, groupId],
  );

  const paymentRows = paymentRowsRaw as LegacyMonthlyRow[];
  for (const row of paymentRows) {
    const index = row.month - 1;
    if (index >= 0 && index < 12) {
      output[index] += Number(row.total ?? 0);
    }
  }

  const [incomeRowsRaw] = await conn.query(
    `SELECT
      MONTH(i.fecha) AS month,
      COALESCE(SUM(i.monto), 0) AS total
    FROM INGRESOS i
    WHERE YEAR(i.fecha) = ?
      AND i.id_cat_grupos_cobro = ?
      AND i.activo = 1
    GROUP BY MONTH(i.fecha)`,
    [year, groupId],
  );

  const incomeRows = incomeRowsRaw as LegacyMonthlyRow[];
  for (const row of incomeRows) {
    const index = row.month - 1;
    if (index >= 0 && index < 12) {
      output[index] += Number(row.total ?? 0);
    }
  }

  return output;
}

function diffSeries(runtime: number[], legacy: number[]): number[] {
  return runtime.map((value, index) => Number((value - (legacy[index] ?? 0)).toFixed(2)));
}

async function main(): Promise<void> {
  const summary = await getFinancialSummaryUseCase.execute({ year: 2025 });
  if (!summary) {
    throw new Error("No fue posible generar el resumen financiero");
  }

  const table = summary.extraordinaryIncomeMultiYearTable;
  const years = [...table.years];

  const rowById = new Map(
    table.rows.map((row) => [
      row.id,
      new Map(row.yearly.map((yearSlice: RuntimeYearSlice) => [yearSlice.year, yearSlice])),
    ]),
  );

  const conn = await mysql.createConnection({
    host: requiredEnv("LEGACY_DB_HOST"),
    port: Number.parseInt(process.env.LEGACY_DB_PORT ?? "3306", 10),
    user: requiredEnv("LEGACY_DB_USER"),
    password: requiredEnv("LEGACY_DB_PASSWORD"),
    database: requiredEnv("LEGACY_DB_NAME"),
    charset: "utf8mb4",
  });

  const result: Record<string, unknown> = {
    years,
    rows: [] as unknown[],
  };

  for (const year of years) {
    const legacyCondo = await loadLegacySeriesForGroup(conn, year, 3);
    const legacyCommerce = await loadLegacySeriesForGroup(conn, year, 6);
    const legacyTotal = sumSeries([legacyCondo, legacyCommerce]);

    const runtimeCondo = rowById.get("extra-condo")?.get(year)?.months ?? createZeroSeries();
    const runtimeCommerce = rowById.get("extra-commerce")?.get(year)?.months ?? createZeroSeries();
    const runtimeTotal = rowById.get("extraordinary-income-total")?.get(year)?.months ?? createZeroSeries();

    (result.rows as unknown[]).push({
      year,
      extraCondo: {
        runtimeAnnual: Number(annualTotal(runtimeCondo).toFixed(2)),
        legacyAnnual: Number(annualTotal(legacyCondo).toFixed(2)),
        deltaAnnual: Number((annualTotal(runtimeCondo) - annualTotal(legacyCondo)).toFixed(2)),
        deltaMonths: diffSeries(runtimeCondo, legacyCondo),
      },
      extraCommerce: {
        runtimeAnnual: Number(annualTotal(runtimeCommerce).toFixed(2)),
        legacyAnnual: Number(annualTotal(legacyCommerce).toFixed(2)),
        deltaAnnual: Number((annualTotal(runtimeCommerce) - annualTotal(legacyCommerce)).toFixed(2)),
        deltaMonths: diffSeries(runtimeCommerce, legacyCommerce),
      },
      total: {
        runtimeAnnual: Number(annualTotal(runtimeTotal).toFixed(2)),
        legacyAnnual: Number(annualTotal(legacyTotal).toFixed(2)),
        deltaAnnual: Number((annualTotal(runtimeTotal) - annualTotal(legacyTotal)).toFixed(2)),
        deltaMonths: diffSeries(runtimeTotal, legacyTotal),
      },
    });
  }

  await conn.end();

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
