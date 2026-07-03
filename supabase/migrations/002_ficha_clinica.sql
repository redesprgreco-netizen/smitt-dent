-- ============================================================
-- Smitt-Dent — Migration 002: Ficha clínica del paciente
-- (Ficha de identificación completa + Antecedentes Patológicos
--  Personales + Consentimiento Informado)
-- Ejecutar en el SQL Editor de Supabase, DESPUÉS de 001_initial_schema.sql
-- ============================================================

-- ENUMS nuevos
CREATE TYPE estado_salud_general AS ENUM ('bueno', 'regular', 'malo');
CREATE TYPE sexo AS ENUM ('masculino', 'femenino', 'otro');

-- ============================================================
-- I. FICHA DE IDENTIFICACIÓN — columnas adicionales en expedientes
-- ============================================================
ALTER TABLE expedientes
  ADD COLUMN sexo                         sexo,
  ADD COLUMN ocupacion                    VARCHAR(120),
  ADD COLUMN domicilio                    VARCHAR(200),
  ADD COLUMN ciudad                       VARCHAR(80),
  ADD COLUMN codigo_postal                VARCHAR(10),
  ADD COLUMN contacto_emergencia_nombre   VARCHAR(120),
  ADD COLUMN contacto_emergencia_telefono VARCHAR(20),
  ADD COLUMN llenado_por_nombre           VARCHAR(120),
  ADD COLUMN llenado_por_parentesco       VARCHAR(60);

-- ============================================================
-- II. TABLA: antecedentes_patologicos
-- (Antecedentes Patológicos Personales — cuestionario 1 a 1 con expediente)
-- ============================================================
CREATE TABLE antecedentes_patologicos (
  id            SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL UNIQUE REFERENCES expedientes(id),

  -- 1. Estado de salud general
  estado_salud  estado_salud_general,

  -- 2. Enfermedades personales (Sí/No)
  fe_reumatica        BOOLEAN NOT NULL DEFAULT FALSE,
  enf_cardiovascular  BOOLEAN NOT NULL DEFAULT FALSE,
  mareos_desmayos     BOOLEAN NOT NULL DEFAULT FALSE,
  diabetes_personal   BOOLEAN NOT NULL DEFAULT FALSE,
  hepatitis           BOOLEAN NOT NULL DEFAULT FALSE,
  vih_sida            BOOLEAN NOT NULL DEFAULT FALSE,
  artritis_reumatismo BOOLEAN NOT NULL DEFAULT FALSE,
  gastritis_ulceras   BOOLEAN NOT NULL DEFAULT FALSE,
  problemas_renales   BOOLEAN NOT NULL DEFAULT FALSE,
  anemia              BOOLEAN NOT NULL DEFAULT FALSE,
  presion_arterial    BOOLEAN NOT NULL DEFAULT FALSE,
  sangrado_anormal    BOOLEAN NOT NULL DEFAULT FALSE,
  moretones_facil     BOOLEAN NOT NULL DEFAULT FALSE,
  transfusiones       BOOLEAN NOT NULL DEFAULT FALSE,
  asma                BOOLEAN NOT NULL DEFAULT FALSE,

  -- 3. Antecedentes familiares (Sí/No)
  diabetes_familiar     BOOLEAN NOT NULL DEFAULT FALSE,
  enf_corazon_familiar   BOOLEAN NOT NULL DEFAULT FALSE,
  hipertension_familiar BOOLEAN NOT NULL DEFAULT FALSE,
  cancer_familiar       BOOLEAN NOT NULL DEFAULT FALSE,

  -- 4. Tratamiento médico actual
  tratamiento_actual         BOOLEAN NOT NULL DEFAULT FALSE,
  tratamiento_actual_detalle TEXT,

  -- 5. Alergia a anestésicos / medicamentos / látex
  alergico_anestesico BOOLEAN NOT NULL DEFAULT FALSE,
  alergico_detalle    TEXT,

  -- 6-8. Otras preguntas de salud
  falta_aire      BOOLEAN NOT NULL DEFAULT FALSE,
  boca_seca       BOOLEAN NOT NULL DEFAULT FALSE,
  embarazada      BOOLEAN NOT NULL DEFAULT FALSE,
  meses_gestacion INTEGER,

  -- 9. Tabaquismo
  tabaquismo       BOOLEAN NOT NULL DEFAULT FALSE,
  cigarros_dia     INTEGER,
  tabaquismo_anios INTEGER,

  -- 10. Drogas
  drogas        BOOLEAN NOT NULL DEFAULT FALSE,
  drogas_cuales VARCHAR(200),
  drogas_anios  INTEGER,

  -- 11. Alergias generales
  alergias_generales BOOLEAN NOT NULL DEFAULT FALSE,
  alergias_cuales    VARCHAR(200),
  alergias_anios     INTEGER,

  -- 12. Alcoholismo
  alcoholismo         BOOLEAN NOT NULL DEFAULT FALSE,
  alcohol_cant_semana VARCHAR(60),
  alcohol_anios       INTEGER,

  updated_by INTEGER NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: consentimiento_informado
-- ============================================================
CREATE TABLE consentimiento_informado (
  id                          SERIAL PRIMARY KEY,
  expediente_id               INTEGER NOT NULL UNIQUE REFERENCES expedientes(id),
  nombre_dentista              VARCHAR(150),
  nombre_representante_legal   VARCHAR(150),
  parentesco                   VARCHAR(60),
  aceptado                     BOOLEAN NOT NULL DEFAULT FALSE,
  firma_nombre                 VARCHAR(150),
  fecha_firma                  DATE,
  created_by                   INTEGER NOT NULL REFERENCES usuarios(id),
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX idx_antecedentes_expediente ON antecedentes_patologicos(expediente_id);
CREATE INDEX idx_consentimiento_expediente ON consentimiento_informado(expediente_id);
