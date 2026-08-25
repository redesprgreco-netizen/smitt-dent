-- ============================================================
-- Smitt-Dent — Migración 005
-- Asegura que existan las columnas de "Plan de pagos" en
-- expedientes (monto_total_manual, numero_pagos_plan). Estas
-- columnas ya se usan en el código (prisma/schema.prisma y
-- app/api/expedientes/[id]/route.ts) pero no tenían un archivo
-- de migración que las creara — si tu base de datos no las tiene,
-- CUALQUIER guardado en la Ficha de identificación (Parte I del
-- expediente) falla con "no se pudo guardar", porque Prisma
-- intenta leer/columnas que no existen al devolver el registro
-- actualizado completo.
--
-- Ejecutar en el SQL Editor de Supabase. Es seguro correrlo
-- aunque las columnas ya existan (usa IF NOT EXISTS).
-- ============================================================

ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS monto_total_manual DECIMAL(10, 2);
ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS numero_pagos_plan  INTEGER;
