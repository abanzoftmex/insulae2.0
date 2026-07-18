import { getCondominiumReportUseCase } from "../src/modules/condominium-report";

async function run() {
  try {
    const report = await getCondominiumReportUseCase.execute();
    console.log("SUCCESS! Report fetched successfully:", report ? "OK" : "NULL");
  } catch (err) {
    console.error("FAILED to fetch report:", err);
  }
}

run();
