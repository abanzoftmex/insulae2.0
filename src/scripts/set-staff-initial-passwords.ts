/**
 * Arranque de contraseñas del panel administrativo.
 *
 * El login ya no acepta contraseñas por defecto. Este script genera una contraseña provisional
 * para cada usuario ACTIVO con acceso al panel (al menos un módulo legible o userType ADMIN) que
 * aún no tenga contraseña, la guarda con SHA-256 (el estándar del login) y la imprime para que
 * la administración la entregue. El usuario debe cambiarla en /cambio-contrasena.
 *
 * Alternativa sin script: el usuario usa "¿Olvidaste tu contraseña?" en /login (requiere correo).
 *
 * Simulación por defecto. Para aplicar:
 *   DATABASE_URL="postgres://..." npx tsx --tsconfig tsconfig.json src/scripts/set-staff-initial-passwords.ts --apply
 * Limitar a una cuenta:  --email admin
 */
import crypto from "crypto";
import { prisma } from "../shared/infrastructure/db/prisma";
import { canAccessAdminPanel, getPermissionsForUser } from "../shared/application/auth/permissions";

function tempPassword(): string {
  // 12 caracteres sin ambiguos (sin 0/O, 1/l/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const emailIdx = process.argv.indexOf("--email");
  const onlyEmail = emailIdx >= 0 ? process.argv[emailIdx + 1]?.trim().toLowerCase() : null;

  // Prefiltro en BD: solo cuentas cuyos roles otorgan al menos un módulo legible (o la cuenta ADMIN),
  // para no recorrer a los ~700 condóminos sin contraseña uno por uno.
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      passwordHash: null,
      OR: [
        { userType: "ADMIN" },
        {
          userRoles: {
            some: {
              role: {
                isActive: true,
                permissions: { some: { isActive: true, canRead: true, module: { isActive: true } } },
              },
            },
          },
        },
      ],
    },
    select: { id: true, email: true, personalEmail: true, businessEmail: true, firstName: true, lastName: true, userType: true },
    orderBy: { email: "asc" },
  });

  const targets: { id: string; label: string; password: string }[] = [];
  for (const u of users) {
    const loginEmail = (u.email || u.personalEmail || u.businessEmail || "").toLowerCase();
    if (onlyEmail && loginEmail !== onlyEmail) continue;
    const allowed = u.userType === "ADMIN" || canAccessAdminPanel(await getPermissionsForUser(u.id));
    if (!allowed) continue;
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "(sin nombre)";
    targets.push({ id: u.id, label: `${name} <${loginEmail || "sin email"}>`, password: tempPassword() });
  }

  console.log(`Usuarios activos con acceso al panel y sin contraseña: ${targets.length}`);
  for (const t of targets) console.log(`  ${t.label.padEnd(60)} ${apply ? t.password : "(se generará al aplicar)"}`);

  if (!apply) {
    console.log("\nSimulación: no se modificó nada. Ejecuta con --apply para fijar las contraseñas.");
    return;
  }

  for (const t of targets) {
    await prisma.user.update({
      where: { id: t.id },
      data: { passwordHash: crypto.createHash("sha256").update(t.password).digest("hex") },
    });
  }
  console.log(`\nContraseñas provisionales fijadas: ${targets.length}. Entrégalas por un canal seguro y pide cambiarlas en /cambio-contrasena.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
