/**
 * Fase 0 — Verificación de preparación de datos para el portal de condóminos (minisitio).
 *
 * SOLO LECTURA. No modifica ningún dato.
 *
 * Responde:
 *  A) ¿Los condóminos tienen passwordHash poblado? ¿En qué formato? (SHA1/MD5/SHA256/bcrypt/plano)
 *  B) ¿Tienen email? ¿Es único? (decisión login email vs usuario)
 *  C) Cobertura de ResidentAssignment (propietarios) y Rental (arrendamientos)
 *  F) ¿El proyecto tiene aviso de privacidad (texto HTML y/o PDF)?
 *
 * Uso:
 *   DATABASE_URL="postgres://..." npx tsx --tsconfig tsconfig.json src/scripts/verify-condomino-readiness.ts
 *   (o con tu .env presente: npx tsx --tsconfig tsconfig.json src/scripts/verify-condomino-readiness.ts)
 */
import { prisma } from "../shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "../config/project-scope";

function classifyHash(hash: string | null | undefined): string {
  if (hash === null || hash === undefined || hash.trim() === "") return "VACÍO/NULL";
  const h = hash.trim();
  if (/^\$2[aby]\$/.test(h)) return "bcrypt";
  if (/^[0-9a-fA-F]{40}$/.test(h)) return "SHA1 (40 hex)";
  if (/^[0-9a-fA-F]{32}$/.test(h)) return "MD5 (32 hex)";
  if (/^[0-9a-fA-F]{64}$/.test(h)) return "SHA256 (64 hex)";
  return `OTRO (len=${h.length})`;
}

function norm(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim().toLowerCase();
  return t === "" ? null : t;
}

function tally<T>(items: T[], keyFn: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = keyFn(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function printTally(title: string, t: Record<string, number>) {
  console.log(`\n${title}`);
  const entries = Object.entries(t).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    console.log("  (sin datos)");
    return;
  }
  for (const [k, v] of entries) console.log(`  ${k.padEnd(28)} ${v}`);
}

async function main() {
  console.log("=".repeat(70));
  console.log("FASE 0 — Verificación de datos para portal de condóminos");
  console.log("=".repeat(70));

  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode, isActive: true },
    select: { id: true, name: true, slug: true },
  });

  if (!condominium) {
    console.error(`\n❌ No se encontró condominio activo con slug="${PROJECT_SCOPE.condominiumCode}"`);
    const all = await prisma.condominium.findMany({ select: { slug: true, name: true, isActive: true } });
    console.error("Condominios disponibles:", JSON.stringify(all, null, 2));
    return;
  }

  console.log(`\nCondominio: ${condominium.name} (slug="${condominium.slug}", id=${condominium.id})`);
  const condoId = condominium.id;

  // ---- Universo de usuarios ----
  const allUsers = await prisma.user.findMany({
    where: { condominiumId: condoId },
    select: {
      id: true,
      userType: true,
      isActive: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      passwordHash: true,
      _count: { select: { assignments: true } },
    },
  });

  const activeUsers = allUsers.filter((u) => u.isActive);
  console.log(`\nUsuarios totales en condominio: ${allUsers.length} (activos: ${activeUsers.length})`);
  printTally("Usuarios activos por tipo (userType):", tally(activeUsers, (u) => u.userType));

  // Condóminos = usuarios activos con al menos una asignación (propietario/residente)
  const condominos = activeUsers.filter((u) => u._count.assignments > 0);
  console.log(`\nUsuarios activos CON ResidentAssignment (condóminos): ${condominos.length}`);

  // ====================================================================
  // A) Contraseñas
  // ====================================================================
  console.log("\n" + "-".repeat(70));
  console.log("A) CONTRASEÑAS (passwordHash)");
  console.log("-".repeat(70));
  printTally("Formato de passwordHash — TODOS los usuarios activos:", tally(activeUsers, (u) => classifyHash(u.passwordHash)));
  printTally("Formato de passwordHash — solo condóminos (con asignación):", tally(condominos, (u) => classifyHash(u.passwordHash)));

  // ====================================================================
  // B) Emails
  // ====================================================================
  console.log("\n" + "-".repeat(70));
  console.log("B) EMAILS (login)");
  console.log("-".repeat(70));
  const condominosConEmail = condominos.filter((u) => norm(u.email) || norm(u.personalEmail) || norm(u.businessEmail));
  console.log(`Condóminos con algún email: ${condominosConEmail.length} / ${condominos.length}`);
  console.log(`Condóminos SIN ningún email: ${condominos.length - condominosConEmail.length}`);

  // Duplicados: el login hace findFirst con OR sobre los 3 campos en TODOS los usuarios.
  // Detectamos qué valores de email son compartidos por >1 usuario activo.
  const emailToUsers = new Map<string, Set<string>>();
  for (const u of activeUsers) {
    for (const e of [norm(u.email), norm(u.personalEmail), norm(u.businessEmail)]) {
      if (!e) continue;
      if (!emailToUsers.has(e)) emailToUsers.set(e, new Set());
      emailToUsers.get(e)!.add(u.id);
    }
  }
  const duplicados = [...emailToUsers.entries()].filter(([, users]) => users.size > 1);
  console.log(`\nValores de email compartidos por >1 usuario activo: ${duplicados.length}`);
  if (duplicados.length > 0) {
    console.log("  (estos emails harían ambiguo el login por email)");
    for (const [email, users] of duplicados.slice(0, 15)) {
      console.log(`  ${email}  → ${users.size} usuarios`);
    }
    if (duplicados.length > 15) console.log(`  ... y ${duplicados.length - 15} más`);
  }

  // ====================================================================
  // C) ResidentAssignment + Rental
  // ====================================================================
  console.log("\n" + "-".repeat(70));
  console.log("C) ASIGNACIONES Y ARRENDAMIENTOS");
  console.log("-".repeat(70));

  const assignments = await prisma.residentAssignment.findMany({
    where: { condominiumId: condoId, isActive: true },
    select: { userId: true, privateAreaId: true, roleName: true },
  });
  const distinctAssignedUsers = new Set(assignments.map((a) => a.userId)).size;
  const distinctAssignedAreas = new Set(assignments.map((a) => a.privateAreaId)).size;
  console.log(`ResidentAssignment activas: ${assignments.length}`);
  console.log(`  usuarios distintos asignados: ${distinctAssignedUsers}`);
  console.log(`  áreas privativas distintas con asignación: ${distinctAssignedAreas}`);
  printTally("Distribución por roleName:", tally(assignments, (a) => a.roleName ?? "(null)"));

  const totalAreas = await prisma.privateArea.count({ where: { condominiumId: condoId } });
  console.log(`\nÁreas privativas totales: ${totalAreas}  (con asignación activa: ${distinctAssignedAreas})`);

  const rentals = await prisma.rental.findMany({
    where: { condominiumId: condoId },
    select: { status: true, administrativeContactUserId: true, operativeContactUserId: true },
  });
  console.log(`\nArrendamientos (Rental) totales: ${rentals.length}`);
  printTally("Por status:", tally(rentals, (r) => r.status ?? "(null)"));
  const rentalsConContacto = rentals.filter((r) => r.administrativeContactUserId || r.operativeContactUserId).length;
  console.log(`  con usuario de contacto (admin u operativo): ${rentalsConContacto}`);

  // ====================================================================
  // F) Aviso de privacidad / branding del proyecto
  // ====================================================================
  console.log("\n" + "-".repeat(70));
  console.log("F) PROYECTO: aviso de privacidad y branding");
  console.log("-".repeat(70));
  const project = await prisma.project.findFirst({
    where: { condominiumId: condoId, isActive: true },
    select: {
      name: true,
      privacyNoticeText: true,
      privacyNoticePdfUrl: true,
      condominiumLogoUrl: true,
      footerLogoUrl: true,
      totalM2: true,
    },
  });
  if (!project) {
    console.log("  ❌ No hay Project activo para este condominio");
  } else {
    console.log(`  Project: ${project.name}`);
    console.log(`  privacyNoticeText (HTML): ${project.privacyNoticeText ? `SÍ (${project.privacyNoticeText.length} chars)` : "no"}`);
    console.log(`  privacyNoticePdfUrl:      ${project.privacyNoticePdfUrl ? "SÍ" : "no"}`);
    console.log(`  condominiumLogoUrl:       ${project.condominiumLogoUrl ? "SÍ" : "no"}`);
    console.log(`  footerLogoUrl:            ${project.footerLogoUrl ? "SÍ" : "no"}`);
    console.log(`  totalM2:                  ${project.totalM2 ?? "(null)"}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("FIN — verificación de solo lectura completada (no se modificó nada)");
  console.log("=".repeat(70));
}

main()
  .catch((e) => {
    console.error("\n❌ Error ejecutando verificación:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
