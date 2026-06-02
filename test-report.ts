import { getCondominiumReportUseCase } from "./src/modules/condominium-report/index";
async function main() {
  const report = await getCondominiumReportUseCase.execute();
  console.log(JSON.stringify(report, null, 2));
}
main();
