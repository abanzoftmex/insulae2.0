/**
 * Reinicia (pone en NULL) el passwordHash de los usuarios del portal de condóminos (minisitio):
 * todos los que tienen el rol "Solo Minisitio" en el condominio del proyecto.
 *
 * Tras el reinicio, el login del minisitio los rechaza hasta que activen una contraseña
 * nueva con "¿Olvidaste tu contraseña?" (flujo forgot -> correo -> reset).
 *
 * Se EXCLUYEN los usuarios que además tienen un rol de sistema (legacyIdGral = 0: Master,
 * Operaciones, Contabilidad, etc.) para no afectar su acceso al panel administrativo,
 * que comparte el mismo passwordHash.
 *
 * Por defecto es simulación (dry-run). Para aplicar:
 *   DATABASE_URL="postgres://..." npx tsx --tsconfig tsconfig.json src/scripts/reset-minisitio-passwords.ts --apply
 */
import { prisma } from "../shared/infrastructure/db/prisma";
import { PROJECT_SCOPE } from "../config/project-scope";
import { minisitioRoleWhere } from "../shared/application/auth/condomino-access";

type Candidate = {
  id: string;
  email: string | null;
  personalEmail: string | null;
  businessEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  userRoles: { role: { name: string } }[];
};

function label(u: Candidate): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "(sin nombre)";
  const email = u.email || u.personalEmail || u.businessEmail || "(sin email)";
  return `${name} <${email}>${u.isActive ? "" : " [inactivo]"}`;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const condominium = await prisma.condominium.findFirst({
    where: { slug: PROJECT_SCOPE.condominiumCode },
    select: { id: true, name: true },
  });
  if (!condominium) {
    throw new Error(`Condominio '${PROJECT_SCOPE.condominiumCode}' no encontrado`);
  }

  const holders = await prisma.user.findMany({
    where: {
      condominiumId: condominium.id,
      userRoles: { some: { role: minisitioRoleWhere(condominium.id) } },
    },
    select: {
      id: true,
      email: true,
      personalEmail: true,
      businessEmail: true,
      firstName: true,
      lastName: true,
      isActive: true,
      passwordHash: true,
      // Roles de sistema (con permisos de módulo): si tiene alguno, no se toca.
      userRoles: {
        where: { role: { isActive: true, legacyIdGral: 0 } },
        select: { role: { select: { name: true } } },
      },
    },
    orderBy: { email: "asc" },
  });

  const withPassword = holders.filter((u) => u.passwordHash !== null);
  const staff = withPassword.filter((u) => u.userRoles.length > 0);
  const targets = withPassword.filter((u) => u.userRoles.length === 0);

  console.log(`Condominio: ${condominium.name}`);
  console.log(`Usuarios con rol "Solo Minisitio": ${holders.length}`);
  console.log(`  con contraseña definida:            ${withPassword.length}`);
  console.log(`  excluidos por tener rol de sistema: ${staff.length}`);
  console.log(`  a reiniciar:                        ${targets.length}`);
  for (const u of targets) console.log(`    - ${label(u)}`);
  for (const u of staff) {
    console.log(`    (excluido) ${label(u)} — ${u.userRoles.map((r) => r.role.name).join(", ")}`);
  }

  if (!apply) {
    console.log("\nSimulación: no se modificó nada. Ejecuta con --apply para aplicar.");
    return;
  }

  if (targets.length === 0) {
    console.log("\nNada que reiniciar.");
    return;
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: targets.map((u) => u.id) } },
    data: { passwordHash: null },
  });
  console.log(`\nContraseñas reiniciadas: ${result.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
