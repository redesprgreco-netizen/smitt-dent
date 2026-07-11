'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import QRCode from 'qrcode'

interface FirmaContrato {
  id: number
  token: string
  clienteNombre: string
  estado: string
  firmadoEn: string | null
  createdAt: string
  contrato: { nombre: string }
}

interface FirmaDetalle extends FirmaContrato {
  pdfUrl: string | null
  firmaUrl: string | null
}

export default function ContratosTab({ expedienteId, pacienteNombre }: { expedienteId: number; pacienteNombre: string }) {
  const [firmas, setFirmas] = useState<FirmaContrato[]>([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [ultimoLink, setUltimoLink] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<FirmaDetalle | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/firmas?expedienteId=${expedienteId}`)
      const data = await res.json()
      if (data.ok) setFirmas(data.data)
    } finally {
      setLoading(false)
    }
  }, [expedienteId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (ultimoLink && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, ultimoLink, { width: 180, margin: 1 })
    }
  }, [ultimoLink])

  async function generarLink() {
    setCreando(true)
    try {
      const res = await fetch('/api/firmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteNombre: pacienteNombre, expedienteId }),
      })
      const data = await res.json()
      if (res.ok) {
        setUltimoLink(data.data.link)
        load()
      } else {
        alert(data.error ?? 'No se pudo generar el enlace')
      }
    } finally {
      setCreando(false)
    }
  }

  async function verDetalle(id: number) {
    const res = await fetch(`/api/firmas/${id}`)
    const data = await res.json()
    if (data.ok) setDetalle(data.data)
  }

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto)
    alert('Enlace copiado')
  }

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 13.5, marginBottom: 12 }}>
          Genera un enlace o código QR para que <strong>{pacienteNombre}</strong> lea y firme el contrato desde su teléfono.
        </p>
        <button className="btn btn-primary btn-sm" onClick={generarLink} disabled={creando}>
          <i className="ti ti-link" /> {creando ? 'Generando...' : 'Generar enlace de firma'}
        </button>

        {ultimoLink && (
          <div style={{ marginTop: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', background: '#f0f6ff', border: '1px solid #bcd6f7', borderRadius: 10, padding: 16 }}>
            <canvas ref={qrCanvasRef} style={{ borderRadius: 6 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Escanea con el teléfono del paciente:</p>
              <code style={{ fontSize: 12, wordBreak: 'break-all', display: 'block', marginBottom: 10 }}>{ultimoLink}</code>
              <button className="btn btn-secondary btn-sm" onClick={() => copiar(ultimoLink)}>
                <i className="ti ti-copy" /> Copiar link
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, padding: '14px 20px 0' }}>Historial de contratos</h3>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: 20 }}>Cargando...</p>
        ) : firmas.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', padding: 20 }}>Este paciente aún no tiene contratos generados.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Estado</th>
                <th>Firmado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {firmas.map(f => (
                <tr key={f.id}>
                  <td>{f.contrato.nombre}</td>
                  <td>
                    <span className={`pill ${f.estado === 'firmado' ? 'pill-green' : 'pill-amber'}`}>
                      {f.estado === 'firmado' ? 'Firmado' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {f.firmadoEn ? new Date(f.firmadoEn).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td>
                    {f.estado === 'firmado' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => verDetalle(f.id)}>
                        <i className="ti ti-eye" /> Ver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal simple de detalle */}
      {detalle && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setDetalle(null)}
        >
          <div className="card" style={{ padding: 24, maxWidth: 480, width: '92%', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{detalle.contrato.nombre}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
              Firmado el {detalle.firmadoEn ? new Date(detalle.firmadoEn).toLocaleString('es-MX') : '—'}
            </p>
            {detalle.firmaUrl && (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Firma:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={detalle.firmaUrl} alt="Firma del paciente" style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, marginBottom: 14, background: '#fafafa' }} />
              </>
            )}
            {detalle.pdfUrl && (
              <a href={detalle.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                <i className="ti ti-file-text" /> Ver documento firmado
              </a>
            )}
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
