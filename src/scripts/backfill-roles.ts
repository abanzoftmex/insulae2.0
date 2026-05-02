import { prisma } from "../shared/infrastructure/db/prisma";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(process.cwd(), ".env") });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.LEGACY_DB_HOST,
    user: process.env.LEGACY_DB_USER,
    password: process.env.LEGACY_DB_PASSWORD,
    database: "sistemasabanza_insulaeValquirico",
    charset: "latin1",
  });

  console.log("Connected to legacy DB");

  // 1. Get Condominium
  const condominium = await prisma.condominium.findFirst({
    where: { slug: "valquirico" },
  });
  if (!condominium) throw new Error("Condominium Val'Quirico not found");

  // 2. Migrate CAT_MODULOS -> ModuleCatalog
  const [legacyModules] = await connection.execute("SELECT * FROM CAT_MODULOS WHERE activo = 1");
  console.log(`Found ${(legacyModules as any[]).length} legacy modules`);

  for (const mod of legacyModules as any[]) {
    await prisma.moduleCatalog.upsert({
      where: { legacyId: mod.id_cat_modulos },
      update: { name: mod.nombre, isActive: mod.activo === 1 },
      create: {
        legacyId: mod.id_cat_modulos,
        name: mod.nombre,
        isActive: mod.activo === 1,
      },
    });
  }

  // 3. Migrate ROLES_CONDOMINAL -> Role
  const [legacyRoles] = await connection.execute("SELECT * FROM ROLES_CONDOMINAL WHERE activo = 1");
  console.log(`Found ${(legacyRoles as any[]).length} legacy roles`);

  for (const role of legacyRoles as any[]) {
    await prisma.role.upsert({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId: role.id_roles_condominal,
        },
      },
      update: {
        name: role.nombre,
        description: role.descripcion,
        legacyIdGral: role.idGral || 0,
        isActive: role.activo === 1,
      },
      create: {
        condominiumId: condominium.id,
        legacyId: role.id_roles_condominal,
        legacyIdGral: role.idGral || 0,
        name: role.nombre,
        description: role.descripcion,
        isActive: role.activo === 1,
      },
    });
  }

  // 4. Migrate Permissions
  const [legacyPerms] = await connection.execute("SELECT * FROM ROLES_CONDOMINAL_HAS_CAT_MODULOS WHERE activo = 1");
  console.log(`Found ${(legacyPerms as any[]).length} legacy permissions`);

  for (const perm of legacyPerms as any[]) {
    const role = await prisma.role.findUnique({
      where: {
        condominiumId_legacyId: {
          condominiumId: condominium.id,
          legacyId: perm.id_roles_condominal,
        },
      },
    });

    const module = await prisma.moduleCatalog.findUnique({
      where: { legacyId: perm.id_cat_modulos },
    });

    if (role && module) {
      const p = perm.permiso || "0000";
      await prisma.rolePermission.upsert({
        where: {
          roleId_moduleId: {
            roleId: role.id,
            moduleId: module.id,
          },
        },
        update: {
          canCreate: p[0] === "1",
          canUpdate: p[1] === "1",
          canRead: p[2] === "1",
          canDelete: p[3] === "1",
        },
        create: {
          roleId: role.id,
          moduleId: module.id,
          canCreate: p[0] === "1",
          canUpdate: p[1] === "1",
          canRead: p[2] === "1",
          canDelete: p[3] === "1",
        },
      });
    }
  }

  console.log("Migration completed successfully");
  await connection.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
