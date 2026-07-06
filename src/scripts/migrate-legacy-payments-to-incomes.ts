import "dotenv/config";
import mysql from "mysql2/promise";
import { prisma } from "../shared/infrastructure/db/prisma";
import { PaymentMethod } from "@prisma/client";

// Ensure environment variables are loaded
const mysqlConfig = {
  host: process.env.LEGACY_DB_HOST || "216.238.67.137",
  user: process.env.LEGACY_DB_USER || "sistemasabanza_insulaeValquirico",
  password: process.env.LEGACY_DB_PASSWORD || "In$uL!ae25!",
  database: process.env.LEGACY_DB_NAME || "sistemasabanza_insulaeValquirico",
};

// Map legacy payment method IDs to Prisma PaymentMethod enum
function mapPaymentMethod(methodId: number | null): PaymentMethod {
  if (!methodId) return PaymentMethod.OTHER;
  switch (methodId) {
    case 1:
      return PaymentMethod.OTHER;
    case 2:
      return PaymentMethod.CASH;
    case 3:
      return PaymentMethod.TRANSFER;
    case 4:
      return PaymentMethod.CHECK;
    case 5:
      return PaymentMethod.CARD;
    case 6:
      return PaymentMethod.TRANSFER; // Custom maps to transfer
    default:
      return PaymentMethod.OTHER;
  }
}

async function main() {
  console.log("Connecting to legacy MySQL database...");
  const legacyConn = await mysql.createConnection(mysqlConfig);
  console.log("Connected successfully.");

  // 1. Get Val'Quirico condominium in Postgres
  const condominium = await prisma.condominium.findFirst({
    where: { name: { contains: "Val" } }
  });
  if (!condominium) {
    throw new Error("Val'Quirico condominium not found in Postgres!");
  }
  console.log(`Resolved target Condominium: ${condominium.name} (${condominium.id})`);

  // 2. Fetch all active private areas in Postgres for mapping
  console.log("Fetching private areas from Postgres...");
  const privateAreas = await prisma.privateArea.findMany({
    where: { condominiumId: condominium.id, legacyId: { not: null } },
    select: { id: true, legacyId: true, name: true }
  });
  const areaByLegacyId = new Map<number, string>();
  for (const area of privateAreas) {
    if (area.legacyId !== null) {
      areaByLegacyId.set(area.legacyId, area.id);
    }
  }
  console.log(`Loaded ${privateAreas.length} private areas.`);

  // 3. Fetch all charge groups in Postgres for mapping
  console.log("Fetching charge groups from Postgres...");
  const chargeGroups = await prisma.chargeGroup.findMany({
    where: { condominiumId: condominium.id, legacyId: { not: null } },
    select: { id: true, legacyId: true, name: true }
  });
  const groupByLegacyId = new Map<number, string>();
  for (const g of chargeGroups) {
    if (g.legacyId !== null) {
      groupByLegacyId.set(g.legacyId, g.id);
    }
  }
  console.log(`Loaded ${chargeGroups.length} charge groups.`);

  // 4. Fetch legacy allocations and charges to map payment groups
  console.log("Fetching legacy allocations and charges mapping...");
  const [allocations] = await legacyConn.query<any[]>(
    "SELECT id_historico_pagos, id_pagos FROM HISTORICO_PAGOS_HAS_PAGOS WHERE activo = 1"
  );
  const [legacyCharges] = await legacyConn.query<any[]>(
    "SELECT id_pagos, id_cat_grupos_cobro FROM PAGOS"
  );

  const chargeToGroup = new Map<number, number>();
  for (const c of legacyCharges) {
    chargeToGroup.set(c.id_pagos, c.id_cat_grupos_cobro);
  }

  const paymentToGroup = new Map<number, number>();
  for (const alloc of allocations) {
    const groupId = chargeToGroup.get(alloc.id_pagos);
    if (groupId !== undefined && groupId !== null) {
      paymentToGroup.set(alloc.id_historico_pagos, groupId);
    }
  }

  // 5. Fetch all active legacy payments from HISTORICO_PAGOS
  console.log("Fetching active legacy payments...");
  const [payments] = await legacyConn.query<any[]>(
    "SELECT * FROM HISTORICO_PAGOS WHERE activo = 1"
  );
  console.log(`Found ${payments.length} active payments in HISTORICO_PAGOS.`);

  // 6. Migrate payments to Postgres Income table
  console.log("Migrating payments to Income table in Postgres...");
  let migratedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    const privateAreaId = areaByLegacyId.get(p.id_areas_privativas);
    if (!privateAreaId) {
      skippedCount++;
      continue;
    }

    // Resolve charge group
    let chargeGroupId: string | null = null;
    const legacyGroupId = paymentToGroup.get(p.id_historico_pagos);
    if (legacyGroupId !== undefined && legacyGroupId !== null) {
      chargeGroupId = groupByLegacyId.get(legacyGroupId) || null;
    }

    // Fallbacks
    if (!chargeGroupId) {
      const fallbackLegacyId = p.id_opcion_estado_cuenta === 2 ? 14 : 13; // Commerce vs Ordinary
      chargeGroupId = groupByLegacyId.get(fallbackLegacyId) || null;
    }

    // Format date properly
    const date = new Date(p.fechaPago);

    const paymentMethod = mapPaymentMethod(p.id_cat_formas_pago);

    const concept = p.folio ? `Pago Folio: ${p.folio}` : `Pago de cuota de mantenimiento`;

    await prisma.income.upsert({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId: p.id_historico_pagos,
        },
      },
      create: {
        condominiumId: condominium.id,
        legacyId: p.id_historico_pagos,
        date,
        concept,
        amount: p.monto,
        paymentMethod,
        notes: p.comentarios || "",
        isActive: p.id_cat_status_historico_pagos === 1,
        isConfirmed: true,
        legacyPrivateAreaId: p.id_areas_privativas,
        legacyChargeGroupId: legacyGroupId || (p.id_opcion_estado_cuenta === 2 ? 14 : 13),
        privateAreaId,
        chargeGroupId,
      },
      update: {
        date,
        concept,
        amount: p.monto,
        paymentMethod,
        notes: p.comentarios || "",
        isActive: p.id_cat_status_historico_pagos === 1,
        privateAreaId,
        chargeGroupId,
      },
    });

    migratedCount++;
    if (migratedCount % 500 === 0) {
      console.log(`Migrated ${migratedCount}/${payments.length} payments...`);
    }
  }

  console.log(`Successfully migrated ${migratedCount} payments. Skipped ${skippedCount} due to missing property mapping.`);

  // 7. Fix representation of payments for area VQ#01A-010 (legacyId 814)
  console.log("\nStarting fix for VQ#01A-010 (legacyId 814)...");

  const targetArea = privateAreas.find(a => a.legacyId === 814);
  if (!targetArea) {
    console.log("WARNING: VQ#01A-010 (legacyId 814) not found in Postgres. Skipping property-level fix.");
  } else {
    // A. Delete manually created payments for this area where legacyId is null
    const deletedManual = await prisma.payment.deleteMany({
      where: {
        privateAreaId: targetArea.id,
        legacyId: null,
      }
    });
    console.log(`Deleted ${deletedManual.count} manual legacy-mock payments with null legacyId.`);

    // B. Fetch active legacy charges (PAGOS) for area 814
    console.log("Fetching active legacy charges for area 814...");
    const [pagoCharges] = await legacyConn.query<any[]>(
      "SELECT * FROM PAGOS WHERE id_areas_privativas = 814 AND activo = 1"
    );
    console.log(`Found ${pagoCharges.length} active charges in legacy.`);

    // C. Upsert these charges into Postgres
    console.log("Upserting charges into Postgres...");
    const chargeIdMap = new Map<number, string>();
    for (const c of pagoCharges) {
      const chargeGroupPostgresId = groupByLegacyId.get(c.id_cat_grupos_cobro);
      if (!chargeGroupPostgresId) {
        console.log(`Skipping legacy charge ${c.id_pagos} because charge group ${c.id_cat_grupos_cobro} is not mapped.`);
        continue;
      }

      const upsertedCharge = await prisma.charge.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId: condominium.id,
            legacyId: c.id_pagos,
          }
        },
        create: {
          condominiumId: condominium.id,
          legacyId: c.id_pagos,
          privateAreaId: targetArea.id,
          chargeGroupId: chargeGroupPostgresId,
          responsibility: c.id_opcion_estado_cuenta === 2 ? "COMMERCE" : "OWNER",
          periodYear: new Date(c.fechaPago).getFullYear(),
          periodMonth: new Date(c.fechaPago).getMonth() + 1,
          amount: c.monto,
          paidAmount: c.montoAbonado || "0",
          interestAmount: "0",
          discountAmount: "0",
          isCollectible: true,
          dueDate: c.fechaVigencia ? new Date(c.fechaVigencia) : null,
          status: c.id_cat_status_pago === 2 ? "PAID" : "OPEN"
        },
        update: {
          amount: c.monto,
          paidAmount: c.montoAbonado || "0",
          status: c.id_cat_status_pago === 2 ? "PAID" : "OPEN"
        }
      });
      chargeIdMap.set(c.id_pagos, upsertedCharge.id);
    }
    console.log(`Upserted ${chargeIdMap.size} charges.`);

    // D. Fetch active legacy payments for area 814
    console.log("Fetching active legacy payments for area 814...");
    const [pagoPayments] = await legacyConn.query<any[]>(
      "SELECT * FROM HISTORICO_PAGOS WHERE id_areas_privativas = 814 AND activo = 1"
    );
    console.log(`Found ${pagoPayments.length} active payments in legacy.`);

    // E. Upsert these payments into Postgres
    console.log("Upserting payments into Postgres...");
    const paymentIdMap = new Map<number, string>();
    for (const p of pagoPayments) {
      const upsertedPayment = await prisma.payment.upsert({
        where: {
          condominiumId_legacyId: {
            condominiumId: condominium.id,
            legacyId: p.id_historico_pagos,
          }
        },
        create: {
          condominiumId: condominium.id,
          legacyId: p.id_historico_pagos,
          paidAt: new Date(p.fechaPago),
          amount: p.monto,
          method: mapPaymentMethod(p.id_cat_formas_pago),
          reference: p.folio || "",
          notes: p.comentarios || "",
          privateAreaId: targetArea.id,
          legacyStatusCode: p.id_cat_status_historico_pagos,
          isLegacyActive: true,
          legacyAreaCode: p.id_areas_privativas,
          legacyAreaIsActive: true,
          isVisibleInFinancialSummary: p.id_cat_status_historico_pagos === 1,
        },
        update: {
          amount: p.monto,
          paidAt: new Date(p.fechaPago),
          reference: p.folio || "",
          notes: p.comentarios || "",
          isVisibleInFinancialSummary: p.id_cat_status_historico_pagos === 1,
        }
      });
      paymentIdMap.set(p.id_historico_pagos, upsertedPayment.id);
    }
    console.log(`Upserted ${paymentIdMap.size} payments.`);

    // F. Fetch allocations and insert/link them in Postgres
    console.log("Linking payments and charges (allocations) in Postgres...");
    const paymentIds = Array.from(paymentIdMap.keys());
    const [areaAllocations] = await legacyConn.query<any[]>(
      "SELECT * FROM HISTORICO_PAGOS_HAS_PAGOS WHERE id_historico_pagos IN (?) AND activo = 1",
      [paymentIds.length > 0 ? paymentIds : [0]]
    );

    let linkCount = 0;
    for (const alloc of areaAllocations) {
      const chargeUuid = chargeIdMap.get(alloc.id_pagos);
      const paymentUuid = paymentIdMap.get(alloc.id_historico_pagos);

      if (chargeUuid && paymentUuid) {
        // Delete existing mapping if any
        await prisma.paymentAllocation.deleteMany({
          where: {
            chargeId: chargeUuid,
            paymentId: paymentUuid
          }
        });

        // Create the allocation
        await prisma.paymentAllocation.create({
          data: {
            chargeId: chargeUuid,
            paymentId: paymentUuid,
            amount: alloc.monto || "0"
          }
        });
        linkCount++;
      }
    }
    console.log(`Linked ${linkCount} payments to charges.`);
  }

  await legacyConn.end();
  console.log("\nMigration completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
