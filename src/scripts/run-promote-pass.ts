import { PromoteFromStagingUseCase } from "@/modules/migration-etl/application/promote-from-staging.use-case";
import { prisma } from "@/shared/infrastructure/db/prisma";

async function main(): Promise<void> {
  const runId = process.argv.find((arg) => arg.startsWith("--runId="))?.split("=")[1];
  if (!runId) {
    throw new Error("Missing --runId argument");
  }

  const useCase = new PromoteFromStagingUseCase();
  await useCase.execute({ runId, dryRun: false });

  console.log(JSON.stringify({ runId, status: "PROMOTION_PASS_DONE" }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
