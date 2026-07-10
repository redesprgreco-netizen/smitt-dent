-- ============================================================
-- Contratos (PDF que sube el admin) y firmas de clientes por link
-- ============================================================

CREATE TABLE contratos (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  storage_path   VARCHAR(255) NOT NULL,
  activo         BOOLEAN NOT NULL DEFAULT true,
  subido_por     INTEGER REFERENCES usuarios(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE firmas_contrato (
  id                  SERIAL PRIMARY KEY,
  token               VARCHAR(64) NOT NULL UNIQUE,
  contrato_id         INTEGER NOT NULL REFERENCES contratos(id),
  cliente_nombre      VARCHAR(150) NOT NULL,
  cliente_telefono    VARCHAR(30),
  estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente | firmado
  firma_storage_path  VARCHAR(255),
  huella_storage_path VARCHAR(255), -- reservado para futuro escáner de huella
  ip_address          VARCHAR(45),
  user_agent          VARCHAR(255),
  firmado_en          TIMESTAMPTZ,
  creado_por          INTEGER REFERENCES usuarios(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_firmas_contrato_token ON firmas_contrato(token);
CREATE INDEX idx_firmas_contrato_estado ON firmas_contrato(estado);

-- RLS: el acceso normal es siempre vía API (service role), no vía cliente directo del navegador
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmas_contrato ENABLE ROW LEVEL SECURITY;
