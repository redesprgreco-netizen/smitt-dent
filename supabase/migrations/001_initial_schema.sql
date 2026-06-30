-- ============================================================
-- Smitt-Dent — Migration SQL para Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ENUMS
CREATE TYPE rol AS ENUM ('admin', 'doctora', 'visitante');
CREATE TYPE estado_usuario AS ENUM ('pendiente', 'activo', 'inactivo');
CREATE TYPE estado_cita AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada');
CREATE TYPE estado_expediente AS ENUM ('activo', 'inactivo');
CREATE TYPE estado_pieza AS ENUM ('sin_tratamiento', 'tratado', 'pendiente', 'extraccion');
CREATE TYPE estado_tratamiento AS ENUM ('pendiente', 'en_curso', 'realizado');
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'transferencia', 'tarjeta');
CREATE TYPE estado_pago AS ENUM ('activo', 'anulado');
CREATE TYPE tipo_movimiento AS ENUM ('entrada', 'salida');

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(80) NOT NULL,
  apellido      VARCHAR(80) NOT NULL,
  correo        VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           rol NOT NULL DEFAULT 'doctora',
  color_agenda  VARCHAR(7),
  estado        estado_usuario NOT NULL DEFAULT 'pendiente',
  aprobado_por  INTEGER REFERENCES usuarios(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: citas
-- ============================================================
CREATE TABLE citas (
  id                SERIAL PRIMARY KEY,
  nombre_paciente   VARCHAR(80) NOT NULL,
  apellido_paciente VARCHAR(80) NOT NULL,
  asunto            VARCHAR(200) NOT NULL,
  fecha             DATE NOT NULL,
  hora              TIME NOT NULL,
  notas             TEXT,
  doctora_id        INTEGER NOT NULL REFERENCES usuarios(id),
  expediente_id     INTEGER,  -- FK a expedientes, se agrega después
  estado            estado_cita NOT NULL DEFAULT 'pendiente',
  created_by        INTEGER NOT NULL REFERENCES usuarios(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Evitar doble cita de la misma doctora en el mismo horario
  UNIQUE (doctora_id, fecha, hora)
);

-- ============================================================
-- TABLA: expedientes
-- ============================================================
CREATE TABLE expedientes (
  id               SERIAL PRIMARY KEY,
  folio            VARCHAR(12) NOT NULL UNIQUE,
  nombre           VARCHAR(80) NOT NULL,
  apellido         VARCHAR(80) NOT NULL,
  fecha_nacimiento DATE,
  telefono         VARCHAR(20),
  correo           VARCHAR(120),
  alergias         TEXT,
  motivo_inicial   TEXT,
  doctora_id       INTEGER NOT NULL REFERENCES usuarios(id),
  estado           estado_expediente NOT NULL DEFAULT 'activo',
  created_by       INTEGER NOT NULL REFERENCES usuarios(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agregar FK de citas -> expedientes ahora que existe la tabla
ALTER TABLE citas ADD CONSTRAINT fk_cita_expediente
  FOREIGN KEY (expediente_id) REFERENCES expedientes(id);

-- ============================================================
-- TABLA: historial_clinico
-- (Sin updated_at — notas son inmutables)
-- ============================================================
CREATE TABLE historial_clinico (
  id               SERIAL PRIMARY KEY,
  expediente_id    INTEGER NOT NULL REFERENCES expedientes(id),
  titulo           VARCHAR(200) NOT NULL,
  descripcion      TEXT NOT NULL,
  es_correccion    BOOLEAN NOT NULL DEFAULT FALSE,
  nota_original_id INTEGER REFERENCES historial_clinico(id),
  created_by       INTEGER NOT NULL REFERENCES usuarios(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: odontograma_piezas
-- ============================================================
CREATE TABLE odontograma_piezas (
  id            SERIAL PRIMARY KEY,
  expediente_id INTEGER NOT NULL REFERENCES expedientes(id),
  numero_pieza  SMALLINT NOT NULL CHECK (numero_pieza BETWEEN 11 AND 48),
  estado        estado_pieza NOT NULL DEFAULT 'sin_tratamiento',
  notas         TEXT,
  updated_by    INTEGER NOT NULL REFERENCES usuarios(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expediente_id, numero_pieza)
);

-- ============================================================
-- TABLA: odontograma_historial
-- (Inmutable — solo INSERT)
-- ============================================================
CREATE TABLE odontograma_historial (
  id              SERIAL PRIMARY KEY,
  expediente_id   INTEGER NOT NULL REFERENCES expedientes(id),
  numero_pieza    SMALLINT NOT NULL,
  estado_anterior estado_pieza NOT NULL,
  estado_nuevo    estado_pieza NOT NULL,
  changed_by      INTEGER NOT NULL REFERENCES usuarios(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: plan_tratamiento
-- ============================================================
CREATE TABLE plan_tratamiento (
  id              SERIAL PRIMARY KEY,
  expediente_id   INTEGER NOT NULL REFERENCES expedientes(id),
  concepto        VARCHAR(200) NOT NULL,
  piezas          VARCHAR(100),
  cantidad        DECIMAL(6,2) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,  -- cantidad * precio_unitario calculado en app
  descuento_pct   DECIMAL(5,2) NOT NULL DEFAULT 0,
  estado          estado_tratamiento NOT NULL DEFAULT 'pendiente',
  created_by      INTEGER NOT NULL REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: pagos
-- ============================================================
CREATE TABLE pagos (
  id               SERIAL PRIMARY KEY,
  folio_recibo     VARCHAR(15) NOT NULL UNIQUE,
  expediente_id    INTEGER NOT NULL REFERENCES expedientes(id),
  monto            DECIMAL(10,2) NOT NULL,
  metodo_pago      metodo_pago NOT NULL,
  concepto         VARCHAR(200),
  estado           estado_pago NOT NULL DEFAULT 'activo',
  motivo_anulacion TEXT,
  anulado_por      INTEGER REFERENCES usuarios(id),
  anulado_at       TIMESTAMPTZ,
  created_by       INTEGER NOT NULL REFERENCES usuarios(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: inventario_articulos
-- ============================================================
CREATE TABLE inventario_articulos (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  categoria     VARCHAR(80),
  unidad_medida VARCHAR(30) NOT NULL,
  stock_actual  DECIMAL(8,2) NOT NULL DEFAULT 0,
  stock_minimo  DECIMAL(8,2) NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: inventario_movimientos
-- ============================================================
CREATE TABLE inventario_movimientos (
  id          SERIAL PRIMARY KEY,
  articulo_id INTEGER NOT NULL REFERENCES inventario_articulos(id),
  tipo        tipo_movimiento NOT NULL,
  cantidad    DECIMAL(8,2) NOT NULL,
  notas       TEXT,
  created_by  INTEGER NOT NULL REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: bitacora
-- (Solo INSERT — nunca UPDATE ni DELETE)
-- ============================================================
CREATE TABLE bitacora (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      INTEGER REFERENCES usuarios(id),
  accion          VARCHAR(80) NOT NULL,
  tabla_afectada  VARCHAR(60) NOT NULL,
  registro_id     INTEGER,
  valor_anterior  JSONB,
  valor_nuevo     JSONB,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para rendimiento
-- ============================================================
CREATE INDEX idx_citas_fecha ON citas(fecha);
CREATE INDEX idx_citas_doctora ON citas(doctora_id);
CREATE INDEX idx_expedientes_doctora ON expedientes(doctora_id);
CREATE INDEX idx_expedientes_folio ON expedientes(folio);
CREATE INDEX idx_historial_expediente ON historial_clinico(expediente_id);
CREATE INDEX idx_odonto_piezas_expediente ON odontograma_piezas(expediente_id);
CREATE INDEX idx_plan_expediente ON plan_tratamiento(expediente_id);
CREATE INDEX idx_pagos_expediente ON pagos(expediente_id);
CREATE INDEX idx_pagos_fecha ON pagos(created_at);
CREATE INDEX idx_bitacora_usuario ON bitacora(usuario_id);
CREATE INDEX idx_bitacora_fecha ON bitacora(created_at);
CREATE INDEX idx_bitacora_accion ON bitacora(accion);

-- ============================================================
-- FUNCIÓN: auto-incrementar folios
-- ============================================================
CREATE OR REPLACE FUNCTION generar_folio_expediente()
RETURNS TEXT AS $$
DECLARE
  ultimo_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO ultimo_id FROM expedientes;
  RETURN 'EXP-' || LPAD(ultimo_id::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generar_folio_recibo()
RETURNS TEXT AS $$
DECLARE
  ultimo_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO ultimo_id FROM pagos;
  RETURN 'REC-' || LPAD(ultimo_id::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCIÓN: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_citas_updated_at
  BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_expedientes_updated_at
  BEFORE UPDATE ON expedientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_plan_updated_at
  BEFORE UPDATE ON plan_tratamiento
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inventario_updated_at
  BEFORE UPDATE ON inventario_articulos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUNCIÓN: actualizar stock al registrar movimiento
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE inventario_articulos
    SET stock_actual = stock_actual + NEW.cantidad
    WHERE id = NEW.articulo_id;
  ELSIF NEW.tipo = 'salida' THEN
    UPDATE inventario_articulos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.articulo_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_stock
  AFTER INSERT ON inventario_movimientos
  FOR EACH ROW EXECUTE FUNCTION actualizar_stock();

-- ============================================================
-- VISTA: resumen de pagos por expediente
-- ============================================================
CREATE OR REPLACE VIEW vista_saldo_expediente AS
SELECT
  e.id AS expediente_id,
  e.folio,
  e.nombre || ' ' || e.apellido AS paciente,
  COALESCE(SUM(
    pt.subtotal * (1 - pt.descuento_pct / 100)
  ), 0) AS total_presupuesto,
  COALESCE(SUM(
    CASE WHEN p.estado = 'activo' THEN p.monto ELSE 0 END
  ), 0) AS total_pagado,
  COALESCE(SUM(
    pt.subtotal * (1 - pt.descuento_pct / 100)
  ), 0) - COALESCE(SUM(
    CASE WHEN p.estado = 'activo' THEN p.monto ELSE 0 END
  ), 0) AS saldo_pendiente
FROM expedientes e
LEFT JOIN plan_tratamiento pt ON pt.expediente_id = e.id
LEFT JOIN pagos p ON p.expediente_id = e.id
WHERE e.estado = 'activo'
GROUP BY e.id, e.folio, e.nombre, e.apellido;

-- ============================================================
-- VISTA: alertas de inventario bajo mínimo
-- ============================================================
CREATE OR REPLACE VIEW vista_alertas_inventario AS
SELECT id, nombre, categoria, unidad_medida, stock_actual, stock_minimo,
       (stock_minimo - stock_actual) AS faltante
FROM inventario_articulos
WHERE activo = TRUE AND stock_actual < stock_minimo
ORDER BY faltante DESC;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Supabase
-- NOTA: La autenticación es JWT propio (no Supabase Auth).
-- RLS se aplica a nivel de service_role desde la API.
-- Para mayor seguridad, deshabilitar acceso directo al cliente.
-- ============================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE odontograma_piezas ENABLE ROW LEVEL SECURITY;
ALTER TABLE odontograma_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tratamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora ENABLE ROW LEVEL SECURITY;

-- Solo el service_role (backend) tiene acceso total.
-- Los clientes directos son bloqueados.
-- El acceso se gestiona por la API de Next.js.

-- ============================================================
-- DATOS INICIALES: Admin por defecto
-- Contraseña: cambiar en primer login
-- Hash de 'SmittDent2024!' con bcrypt 10 rounds
-- ============================================================
INSERT INTO usuarios (nombre, apellido, correo, password_hash, rol, color_agenda, estado)
VALUES (
  'Administradora',
  'SmittDent',
  'admin@smittdent.com',
  '$2b$10$placeholder_hash_change_on_first_login',
  'admin',
  '#0d2b55',
  'activo'
);
