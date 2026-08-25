-- ============================================================
-- Smitt-Dent — Migration 006: Odontograma profesional
-- Agrega estados clínicos reales (caries, obturado, corona,
-- endodoncia, ausente, implante, sellante) y soporte para marcar
-- hallazgos por CARA del diente (oclusal, mesial, distal,
-- vestibular, palatino), no solo por pieza completa.
-- Ejecutar en el SQL Editor de Supabase, DESPUÉS de 001_initial_schema.sql
-- No modifica ni borra ningún dato existente.
-- ============================================================

-- Nuevos valores del enum estado_pieza (los 4 que ya existían no se tocan)
ALTER TYPE estado_pieza ADD VALUE IF NOT EXISTS 'caries';
ALTER TYPE estado_pieza ADD VALUE IF NOT EXISTS 'obturado';
ALTER TYPE estado_pieza ADD VALUE IF NOT EXISTS 'corona';
ALTER TYPE estado_pieza ADD VALUE IF NOT EXISTS 'endodoncia';
ALTER TYPE estado_pieza ADD VALUE IF NOT EXISTS 'ausente';
ALTER TYPE estado_pieza ADD VALUE IF NOT EXISTS 'implante';
ALTER TYPE estado_pieza ADD VALUE IF NOT EXISTS 'sellante';

-- Hallazgos por cara del diente, ej: {"oclusal":"caries","mesial":"obturado"}
ALTER TABLE odontograma_piezas
  ADD COLUMN IF NOT EXISTS superficies JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- IMPORTANTE: Postgres no permite usar un valor de enum recién
-- agregado dentro de la MISMA transacción en la que se creó.
-- Por eso este script solo agrega los valores; la app los podrá
-- usar normalmente en cuanto termines de ejecutar este script
-- (no necesitas hacer nada más, es una limitación solo del
-- instante en que corre este mismo script).
-- ============================================================
