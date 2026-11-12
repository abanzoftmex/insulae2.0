-- Agregar columna color al catálogo de roles y asignar colores iniciales distinguibles sin alterar permisos ni estado.
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "color" TEXT;

UPDATE "Role"
SET "color" = CASE LOWER(TRIM("name"))
  WHEN 'master' THEN '#304854'
  WHEN 'asistente de dirección general' THEN '#1d4ed8'
  WHEN 'auxiliar administrativo ingresos-egresos' THEN '#0e7490'
  WHEN 'coordinador de contabilidad' THEN '#155e75'
  WHEN 'dirección insulae' THEN '#4338ca'
  WHEN 'estadistica' THEN '#6d28d9'
  WHEN 'mantenimiento y cominfra' THEN '#0f766e'
  WHEN 'operaciones valquirico' THEN '#047857'
  WHEN 'paramédicos' THEN '#86198f'
  WHEN 'recepción de condominio' THEN '#be185d'
  WHEN 'solo minisitio' THEN '#a14607'
  WHEN 'dominio pleno' THEN '#825f12'
  WHEN 'arrendatario' THEN '#9a3412'
  WHEN 'dueño legal' THEN '#5b21b6'
  WHEN 'dueño moral' THEN '#7e22ce'
  WHEN 'ficha de contacto' THEN '#374151'
  WHEN 'administrador de subcondominio' THEN '#0369a1'
  ELSE '#304854'
END
WHERE "color" IS NULL OR TRIM("color") = '';

