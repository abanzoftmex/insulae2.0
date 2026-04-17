import { prisma } from "@/shared/infrastructure/db/prisma";

async function run(): Promise<void> {
  // 1) Fill missing requiresInvoice directly in Neon.
  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "requiresInvoice" = CASE WHEN "userType" = 'LEGAL_ENTITY' THEN true ELSE false END
    WHERE "requiresInvoice" IS NULL
  `);

  // 2) Rebuild commerce rows from Neon relations only.
  await prisma.$executeRawUnsafe(`DELETE FROM "UserCommerce"`);

  // Prefer tenant/commercial names from active rentals for users with manageable counts.
  await prisma.$executeRawUnsafe(`
    WITH rental_source AS (
      SELECT DISTINCT
        ra."condominiumId",
        ra."userId",
        BTRIM(r."tenantName") AS "commerceName"
      FROM "ResidentAssignment" ra
      JOIN "Rental" r
        ON r."privateAreaId" = ra."privateAreaId"
       AND r."condominiumId" = ra."condominiumId"
      WHERE ra."isActive" = true
        AND r."status" IN ('1', '2', '3', '4')
        AND r."tenantName" IS NOT NULL
        AND LENGTH(BTRIM(r."tenantName")) > 0
    ),
    rental_counts AS (
      SELECT "userId", COUNT(*)::int AS cnt
      FROM rental_source
      GROUP BY "userId"
    ),
    ranked AS (
      SELECT
        rs."condominiumId",
        rs."userId",
        rs."commerceName",
        ROW_NUMBER() OVER (
          PARTITION BY rs."userId"
          ORDER BY rs."commerceName" ASC
        )::int AS "sortOrder"
      FROM rental_source rs
      JOIN rental_counts rc
        ON rc."userId" = rs."userId"
      WHERE rc.cnt <= 20
    )
    INSERT INTO "UserCommerce" (
      id,
      "condominiumId",
      "userId",
      "commerceName",
      "sortOrder",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    SELECT
      gen_random_uuid(),
      "condominiumId",
      "userId",
      "commerceName",
      "sortOrder",
      true,
      NOW(),
      NOW()
    FROM ranked
  `);

  // Fallback: users with no commerce rows yet, use active private area names.
  await prisma.$executeRawUnsafe(`
    WITH users_without_commerce AS (
      SELECT u.id AS "userId", u."condominiumId"
      FROM "User" u
      LEFT JOIN "UserCommerce" uc
        ON uc."userId" = u.id
       AND uc."isActive" = true
      WHERE u."isActive" = true
      GROUP BY u.id, u."condominiumId"
      HAVING COUNT(uc.id) = 0
    ),
    assignment_counts AS (
      SELECT ra."userId", COUNT(*)::int AS cnt
      FROM "ResidentAssignment" ra
      JOIN users_without_commerce uwc
        ON uwc."userId" = ra."userId"
      WHERE ra."isActive" = true
      GROUP BY ra."userId"
    ),
    assignment_source AS (
      SELECT
        ra."condominiumId",
        ra."userId",
        BTRIM(pa.name) AS "commerceName",
        pa.id AS "privateAreaId"
      FROM "ResidentAssignment" ra
      JOIN users_without_commerce uwc
        ON uwc."userId" = ra."userId"
      JOIN assignment_counts ac
        ON ac."userId" = ra."userId"
      JOIN "PrivateArea" pa
        ON pa.id = ra."privateAreaId"
      WHERE ra."isActive" = true
        AND ac.cnt <= 20
        AND pa.name IS NOT NULL
        AND LENGTH(BTRIM(pa.name)) > 0
    ),
    ranked AS (
      SELECT
        asrc."condominiumId",
        asrc."userId",
        asrc."commerceName",
        ROW_NUMBER() OVER (
          PARTITION BY asrc."userId"
          ORDER BY asrc."commerceName" ASC, asrc."privateAreaId" ASC
        )::int AS "sortOrder"
      FROM assignment_source asrc
    )
    INSERT INTO "UserCommerce" (
      id,
      "condominiumId",
      "userId",
      "commerceName",
      "sortOrder",
      "isActive",
      "createdAt",
      "updatedAt"
    )
    SELECT
      gen_random_uuid(),
      "condominiumId",
      "userId",
      "commerceName",
      "sortOrder",
      true,
      NOW(),
      NOW()
    FROM ranked
  `);

  const [invoiceNullRows, totalCommerceRows, adminRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(*)::int AS cnt FROM "User" WHERE "isActive" = true AND "requiresInvoice" IS NULL`,
    ),
    prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(*)::int AS cnt FROM "UserCommerce" WHERE "isActive" = true`,
    ),
    prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(*)::int AS cnt
       FROM "UserCommerce" uc
       JOIN "User" u ON u.id = uc."userId"
       WHERE u."legacyId" = 812 AND uc."isActive" = true`,
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        requiresInvoiceNullActiveUsers: invoiceNullRows[0]?.cnt ?? 0,
        activeUserCommerceRows: totalCommerceRows[0]?.cnt ?? 0,
        adminLegacy812CommerceRows: adminRows[0]?.cnt ?? 0,
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
