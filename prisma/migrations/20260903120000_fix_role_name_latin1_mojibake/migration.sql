-- Repara nombres y descripciones de roles guardados con doble codificación
-- (bytes UTF-8 leídos como latin1 durante la migración del legacy),
-- p. ej. "DueÃ±o Legal" -> "Dueño Legal".
--
-- Idempotente: solo toca filas con el patrón de mojibake y que sean
-- representables en LATIN1 (de lo contrario convert_to fallaría).
UPDATE "Role"
SET "name" = convert_from(convert_to("name", 'LATIN1'), 'UTF8'),
    "updatedAt" = NOW()
WHERE "name" LIKE '%Ã%'
  AND "name" !~ '[^\x01-\xFF]';

UPDATE "Role"
SET "description" = convert_from(convert_to("description", 'LATIN1'), 'UTF8'),
    "updatedAt" = NOW()
WHERE "description" LIKE '%Ã%'
  AND "description" !~ '[^\x01-\xFF]';
