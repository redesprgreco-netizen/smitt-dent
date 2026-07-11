-- ============================================================
-- Vincula cada firma de contrato con el expediente del paciente (opcional)
-- ============================================================

ALTER TABLE firmas_contrato
  ADD COLUMN expediente_id INTEGER REFERENCES expedientes(id);

CREATE INDEX idx_firmas_contrato_expediente ON firmas_contrato(expediente_id);
