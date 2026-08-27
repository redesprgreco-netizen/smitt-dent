-- Una sola cita puede ocupar cada fecha y hora, sin importar la doctora.
-- Antes de ejecutar, revisar duplicados con:
-- SELECT fecha, hora, COUNT(*) FROM citas GROUP BY fecha, hora HAVING COUNT(*) > 1;
DROP INDEX IF EXISTS citas_doctora_id_fecha_hora_key;
CREATE UNIQUE INDEX IF NOT EXISTS citas_fecha_hora_key ON citas (fecha, hora);

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS medico_temporal_nombre VARCHAR(160),
  ADD COLUMN IF NOT EXISTS medico_temporal_color VARCHAR(7);