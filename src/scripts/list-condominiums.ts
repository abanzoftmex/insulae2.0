/**
 * Fase 0 — Lista TODOS los condominios en la BD con conteos clave (solo lectura).
 * Sirve para saber si la data de Valquirico está bajo otro slug o si esta BD es dev/seed.
 *
 * Uso:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --tsconfig tsconfig.json src/scripts/list-condominiums.ts
 */
import { prisma } from "../shared/infrastructure/db/prisma";

async function main() {
  const condos = await prisma.condominium.findMany({
    select: { id: true, name: true, slug: true, isActive: true },
    orderBy: { name: "asc" },
  });

  console.log(`Condominios en la BD: ${condos.length}\n`);

  for (const c of condos) {
    const [users, areas, assignments, rentals, charges, payments, notifications, tickets, project] =
      await Promise.all([
        prisma.user.count({ where: { condominiumId: c.id } }),
        prisma.privateArea.count({ where: { condominiumId: c.id } }),
        prisma.residentAssignment.count({ where: { condominiumId: c.id, isActive: true } }),
        prisma.rental.count({ where: { condominiumId: c.id } }),
        prisma.charge.count({ where: { condominiumId: c.id } }),
        prisma.payment.count({ where: { condominiumId: c.id } }),
        prisma.notification.count({ where: { condominiumId: c.id } }),
        prisma.ticket.count({ where: { condominiumId: c.id } }),
        prisma.project.findFirst({
          where: { condominiumId: c.id },
          select: { name: true, totalM2: true },
        }),
      ]);

    console.log("=".repeat(60));
    console.log(`${c.name}  (slug="${c.slug}", activo=${c.isActive})`);
    console.log(`  id: ${c.id}`);
    console.log(`  project: ${project?.name ?? "(sin Project)"}  totalM2=${project?.totalM2 ?? "?"}`);
    console.log(`  usuarios:            ${users}`);
    console.log(`  áreas privativas:    ${areas}`);
    console.log(`  asignaciones activas:${assignments}`);
    console.log(`  arrendamientos:      ${rentals}`);
    console.log(`  cargos (Charge):     ${charges}`);
    console.log(`  pagos (Payment):     ${payments}`);
    console.log(`  notificaciones:      ${notifications}`);
    console.log(`  tickets:             ${tickets}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
