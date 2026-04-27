#!/usr/bin/env ts-node
/**
 * validate-fee-report-data.ts
 *
 * Diagnóstico de cobertura de datos para el módulo reporte-cuotas.
 * Ejecutar: npx ts-node --project tsconfig.json src/scripts/validate-fee-report-data.ts
 *
 * NO modifica datos. Solo lectura.
 */
import { prisma } from "@/shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "@/config/project-scope";

const currentYear = new Date().getFullYear();
const previousYear = currentYear - 1;

async function main() {
  console.log("\n🔍 DIAGNÓSTICO — Reporte de Cuotas Ordinarias");
  console.log("=".repeat(55));
  console.log(`Proyecto: ${PROJECT_SCOPE.condominiumName}`);
  console.log(`Año primario: ${currentYear} | Año secundario: ${currentYear + 1}`);
  console.log("=".repeat(55));

  // 1. Condominium
  const condo = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true, name: true },
  });

  if (!condo) {
    console.error("❌ No se encontró el condominio activo en Neon.");
    process.exit(1);
  }
  console.log(`\n✅ Condominio: ${condo.name} (${condo.id})`);

  // 2. ChargeGroup ORDINARY
  const ordinaryGroup = await prisma.chargeGroup.findFirst({
    where: { condominiumId: condo.id, kind: "ORDINARY", isActive: true },
    select: { id: true, name: true },
  });

  if (!ordinaryGroup) {
    console.error("❌ No existe ChargeGroup con kind=ORDINARY. ETL pendiente.");
    process.exit(1);
  }
  console.log(`✅ ChargeGroup ORDINARY: "${ordinaryGroup.name}" (${ordinaryGroup.id})`);

  // 3. PrivateAreas
  const totalAreas = await prisma.privateArea.count({
    where: { condominiumId: condo.id, isActive: true },
  });
  const rootAreas = await prisma.privateArea.count({
    where: { condominiumId: condo.id, isActive: true, parentPrivateAreaId: null },
  });
  const childAreas = await prisma.privateArea.count({
    where: { condominiumId: condo.id, isActive: true, parentPrivateAreaId: { not: null } },
  });
  console.log(`\n📦 Áreas privativas: ${totalAreas} total (${rootAreas} raíz / ${childAreas} FAPs)`);

  // 4. AreaCharges
  const areasWithCharge = await prisma.areaCharge.count({
    where: { condominiumId: condo.id, chargeGroupId: ordinaryGroup.id, isActive: true },
  });
  const areasWithoutCharge = totalAreas - areasWithCharge;
  console.log(`💰 AreaCharge activa (cuota base): ${areasWithCharge} áreas`);
  if (areasWithoutCharge > 0) {
    console.warn(`⚠️  ${areasWithoutCharge} áreas SIN cuota base — revisar ETL`);
  }

  // 5. Charges
  for (const year of [previousYear, currentYear, currentYear + 1]) {
    const chargesCount = await prisma.charge.count({
      where: { condominiumId: condo.id, chargeGroupId: ordinaryGroup.id, periodYear: year },
    });
    const icon = chargesCount > 0 ? "✅" : "⚠️ ";
    console.log(`   ${icon} Charges año ${year}: ${chargesCount}`);
  }

  // 6. Payments
  for (const year of [previousYear, currentYear]) {
    const paymentsCount = await prisma.payment.count({
      where: {
        condominiumId: condo.id,
        paidAt: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31T23:59:59`),
        },
      },
    });
    const detailsCount = await prisma.paymentDetail.count({
      where: {
        condominiumId: condo.id,
        chargeGroupId: ordinaryGroup.id,
        payment: {
          paidAt: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31T23:59:59`),
          },
        },
      },
    });
    const icon = paymentsCount > 0 ? "✅" : "⚠️ ";
    console.log(`   ${icon} Payments ${year}: ${paymentsCount} pagos, ${detailsCount} detalles ordinarios`);
  }

  // 7. PaymentAllocations
  const allocationsCount = await prisma.paymentAllocation.count({
    where: {
      charge: {
        condominiumId: condo.id,
        chargeGroupId: ordinaryGroup.id,
      },
    },
  });
  console.log(`\n🔗 PaymentAllocations (ORDINARY): ${allocationsCount}`);
  if (allocationsCount === 0) {
    console.warn("⚠️  Sin allocations — los pagos por mes y prepaid no mostrarán datos.");
    console.warn("   → Revisar ETL de HISTORICO_PAGOS → PaymentAllocation");
  }

  // 8. Rentals
  const activeRentals = await prisma.rental.count({
    where: { condominiumId: condo.id },
  });
  console.log(`🏪 Rentals (arrendamientos activos): ${activeRentals}`);

  console.log("\n" + "=".repeat(55));
  console.log("✅ Diagnóstico completado");

  if (areasWithoutCharge > 0 || allocationsCount === 0) {
    console.log("\n🛠  Acciones recomendadas:");
    if (areasWithoutCharge > 0) {
      console.log("   • Completar ETL de AreaCharge para todas las áreas");
    }
    if (allocationsCount === 0) {
      console.log("   • Ejecutar backfill de PaymentAllocation desde HISTORICO_PAGOS");
    }
    console.log("\n   ⚠️  El runtime funcionará, pero mostrará $0.00 en celdas sin datos.");
  } else {
    console.log("\n🎉 Datos completos. El módulo reporte-cuotas debería funcionar correctamente.");
  }
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
