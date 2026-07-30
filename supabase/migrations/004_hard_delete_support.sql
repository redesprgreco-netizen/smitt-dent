-- ============================================================
-- Smitt-Dent — Migración 004
-- Permite eliminar usuarios y citas definitivamente sin que el
-- historial clínico se rompa. Todas las relaciones que apuntan a
-- "usuarios" se vuelven opcionales con ON DELETE SET NULL, y se
-- agregan columnas de "foto" (snapshot) con el nombre del doctor/
-- usuario en el momento en que se creó cada registro, para que ese
-- dato se conserve aunque el usuario original sea borrado.
--
-- Ejecutar completo en el SQL Editor de Supabase.
-- ============================================================

BEGIN;

-- ── 1. Columnas de snapshot de nombre ──────────────────────────
ALTER TABLE citas               ADD COLUMN IF NOT EXISTS doctora_nombre    VARCHAR(160);
ALTER TABLE citas               ADD COLUMN IF NOT EXISTS creado_por_nombre VARCHAR(160);
ALTER TABLE expedientes         ADD COLUMN IF NOT EXISTS doctora_nombre    VARCHAR(160);
ALTER TABLE historial_clinico   ADD COLUMN IF NOT EXISTS creado_por_nombre VARCHAR(160);
ALTER TABLE pagos               ADD COLUMN IF NOT EXISTS creado_por_nombre VARCHAR(160);

-- ── 2. Rellenar snapshots con los datos actuales (antes de perder la relación) ──
UPDATE citas c SET doctora_nombre = u.nombre || ' ' || u.apellido
  FROM usuarios u WHERE u.id = c.doctora_id AND c.doctora_nombre IS NULL;
UPDATE citas c SET creado_por_nombre = u.nombre || ' ' || u.apellido
  FROM usuarios u WHERE u.id = c.created_by AND c.creado_por_nombre IS NULL;
UPDATE expedientes e SET doctora_nombre = u.nombre || ' ' || u.apellido
  FROM usuarios u WHERE u.id = e.doctora_id AND e.doctora_nombre IS NULL;
UPDATE historial_clinico h SET creado_por_nombre = u.nombre || ' ' || u.apellido
  FROM usuarios u WHERE u.id = h.created_by AND h.creado_por_nombre IS NULL;
UPDATE pagos p SET creado_por_nombre = u.nombre || ' ' || u.apellido
  FROM usuarios u WHERE u.id = p.created_by AND p.creado_por_nombre IS NULL;

-- ── 3. Constraint único de citas que faltaba reflejar (doctora+fecha+hora) ──
-- (ya existe en la BD desde la migración 001, aquí no se toca)

-- ── 4. Volver opcionales las columnas y sus FK con ON DELETE SET NULL ──
ALTER TABLE citas ALTER COLUMN doctora_id DROP NOT NULL;
ALTER TABLE citas ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_doctora_id_fkey;
ALTER TABLE citas ADD CONSTRAINT citas_doctora_id_fkey FOREIGN KEY (doctora_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_created_by_fkey;
ALTER TABLE citas ADD CONSTRAINT citas_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE expedientes ALTER COLUMN doctora_id DROP NOT NULL;
ALTER TABLE expedientes ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE expedientes DROP CONSTRAINT IF EXISTS expedientes_doctora_id_fkey;
ALTER TABLE expedientes ADD CONSTRAINT expedientes_doctora_id_fkey FOREIGN KEY (doctora_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE expedientes DROP CONSTRAINT IF EXISTS expedientes_created_by_fkey;
ALTER TABLE expedientes ADD CONSTRAINT expedientes_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE historial_clinico ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE historial_clinico DROP CONSTRAINT IF EXISTS historial_clinico_created_by_fkey;
ALTER TABLE historial_clinico ADD CONSTRAINT historial_clinico_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE odontograma_piezas ALTER COLUMN updated_by DROP NOT NULL;
ALTER TABLE odontograma_piezas DROP CONSTRAINT IF EXISTS odontograma_piezas_updated_by_fkey;
ALTER TABLE odontograma_piezas ADD CONSTRAINT odontograma_piezas_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE odontograma_historial ALTER COLUMN changed_by DROP NOT NULL;
ALTER TABLE odontograma_historial DROP CONSTRAINT IF EXISTS odontograma_historial_changed_by_fkey;
ALTER TABLE odontograma_historial ADD CONSTRAINT odontograma_historial_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE plan_tratamiento ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE plan_tratamiento DROP CONSTRAINT IF EXISTS plan_tratamiento_created_by_fkey;
ALTER TABLE plan_tratamiento ADD CONSTRAINT plan_tratamiento_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE pagos ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_created_by_fkey;
ALTER TABLE pagos ADD CONSTRAINT pagos_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_anulado_por_fkey;
ALTER TABLE pagos ADD CONSTRAINT pagos_anulado_por_fkey FOREIGN KEY (anulado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE inventario_movimientos ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE inventario_movimientos DROP CONSTRAINT IF EXISTS inventario_movimientos_created_by_fkey;
ALTER TABLE inventario_movimientos ADD CONSTRAINT inventario_movimientos_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE antecedentes_patologicos ALTER COLUMN updated_by DROP NOT NULL;
ALTER TABLE antecedentes_patologicos DROP CONSTRAINT IF EXISTS antecedentes_patologicos_updated_by_fkey;
ALTER TABLE antecedentes_patologicos ADD CONSTRAINT antecedentes_patologicos_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE consentimiento_informado ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE consentimiento_informado DROP CONSTRAINT IF EXISTS consentimiento_informado_created_by_fkey;
ALTER TABLE consentimiento_informado ADD CONSTRAINT consentimiento_informado_created_by_fkey FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_aprobado_por_fkey;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE bitacora DROP CONSTRAINT IF EXISTS bitacora_usuario_id_fkey;
ALTER TABLE bitacora ADD CONSTRAINT bitacora_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE contratos DROP CONSTRAINT IF EXISTS contratos_subido_por_fkey;
ALTER TABLE contratos ADD CONSTRAINT contratos_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE firmas_contrato DROP CONSTRAINT IF EXISTS firmas_contrato_creado_por_fkey;
ALTER TABLE firmas_contrato ADD CONSTRAINT firmas_contrato_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

COMMIT;

-- Nota: los nombres de constraint asumen la convención por defecto de
-- Postgres (tabla_columna_fkey), que es la que se generó en 001_initial_schema.sql.
-- Si alguna falla con "constraint does not exist", corre primero:
--   SELECT conname FROM pg_constraint WHERE conrelid = '<tabla>'::regclass;
-- para confirmar el nombre real y ajusta el DROP CONSTRAINT correspondiente.
