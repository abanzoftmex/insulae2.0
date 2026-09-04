-- Endurecimiento del sistema de roles del panel administrativo.
-- Idempotente: se puede ejecutar varias veces sin efectos adicionales.

-- 1) Nuevo módulo "Sincronización Luca": la pantalla existía pero no tenía módulo en el
--    catálogo, así que era visible para cualquier rol.
INSERT INTO "ModuleCatalog" ("id", "legacyId", "name", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), NULL, 'Sincronización Luca', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ModuleCatalog" WHERE "name" = 'Sincronización Luca');

-- 2) El rol Master (administrador) tiene permisos completos sobre todos los módulos activos.
--    Antes venía del legacy con solo lectura en Condominio, Contactos, Reglamentos, Cobros
--    masivos, etc., y sin lectura en Presupuesto: al empezar a hacer cumplir la matriz,
--    nadie habría podido administrar esos módulos.
INSERT INTO "RolePermission" ("id", "roleId", "moduleId", "canCreate", "canUpdate", "canRead", "canDelete", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), r."id", m."id", true, true, true, true, true, NOW(), NOW()
FROM "Role" r
CROSS JOIN "ModuleCatalog" m
WHERE r."name" = 'Master' AND r."legacyIdGral" = 0 AND r."isActive" AND m."isActive"
ON CONFLICT ("roleId", "moduleId") DO UPDATE
SET "canCreate" = true, "canUpdate" = true, "canRead" = true, "canDelete" = true,
    "isActive" = true, "updatedAt" = NOW();

-- 3) Los roles de condómino (legacyIdGral > 0: Solo Minisitio, Dominio pleno, Arrendatario,
--    Dueño Legal/Moral, Ficha de contacto, Administrador de subcondominio) describen la
--    relación con la propiedad y se usan en el minisitio; no deben otorgar módulos del panel.
--    Se desactivan (no se borran) los permisos que traían del legacy, para poder revertirlo.
UPDATE "RolePermission" rp
SET "isActive" = false, "updatedAt" = NOW()
FROM "Role" r
WHERE rp."roleId" = r."id" AND r."legacyIdGral" > 0 AND rp."isActive";
