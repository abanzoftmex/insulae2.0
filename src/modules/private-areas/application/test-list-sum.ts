import { PrismaPrivateAreaListingRepository } from "../infrastructure/prisma-private-area-listing.repository";

async function main() {
  const repo = new PrismaPrivateAreaListingRepository();
  const result = await repo.getListing({
    query: "",
    useType: "",
    status: "ACTIVE",
    m2Min: null,
    m2Max: null,
    page: 1,
    pageSize: 100000,
    paginateByTopLevel: true
  });

  if (!result) return;

  // Let's filter out how VM displays them:
  // In the VM, we map row to format row:
  // const isFapRow = row.hierarchyRole === "CHILD";
  // m2Updated: isFapRow ? "" : formatNumber(row.m2Updated, 4)
  // Let's see what is printed on the table in UI:
  let sumUpdatedUi = 0;
  let sumOriginalUi = 0;
  let rowsCount = 0;

  for (const row of result.rows) {
    const isFapRow = row.hierarchyRole === "CHILD";
    const isParent = row.hierarchyRole === "PARENT";
    
    // In UI, if isFapRow is true, the cell value is empty string.
    // Otherwise, we show row.m2Updated.
    if (!isFapRow) {
      sumUpdatedUi += row.m2Updated;
      sumOriginalUi += row.m2Original;
      rowsCount++;
    }
  }

  console.log(`UI Rows contributing to M2 Updated column: ${rowsCount}`);
  console.log(`Sum of M2 Updated column in UI: ${sumUpdatedUi}`);
  console.log(`Sum of M2 Original column in UI: ${sumOriginalUi}`);
}

main().catch(console.error);
