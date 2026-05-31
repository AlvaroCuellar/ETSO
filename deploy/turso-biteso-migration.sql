-- Migración de marca y esquema: BICUVE -> BITESO.
-- Comprobación previa:
--   PRAGMA table_info(works);
-- Ejecutar este archivo solo si existen las columnas antiguas bicuve y bicuve_nombre.
-- Si la base ya tiene biteso y biteso_nombre, no lo ejecutes.

BEGIN;
ALTER TABLE works RENAME COLUMN bicuve TO biteso;
ALTER TABLE works RENAME COLUMN bicuve_nombre TO biteso_nombre;
COMMIT;
