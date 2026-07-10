'use client'
import { useState, useEffect, useCallback } from 'react'

interface Contrato {
  id: number
  nombre: string
  createdAt: string
}

interface FirmaContrato {
  id: number
  token: string
  clienteNombre: string
  clienteTelefono: string | null
  estado: string
  firmadoEn: string | null
  createdAt: string
  contrato: { nombre: string }
}

export default function ContratosPage() {
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [firmas, setFirmas] = useState<FirmaContrato[]>([])
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [creandoLink, setCreandoLink] = useState(false)
  const [ultimoLink, setUltimoLink] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rC, rF] = await Promise.all([fetch('/api/contratos'), fetch('/api/firmas')])
      const dC = await rC.json()
      const dF = await rF.json()
      if (dC.ok) setContrato(dC.data)
      if (dF.ok) setFirmas(dF.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function subirPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('archivo', file)
      formData.append('nombre', file.name)
      const res = await fetch('/api/contratos', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setContrato(data.data)
      } else {
        alert(data.error ?? 'Error al subir el PDF')
      }
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  async function crearLink() {
    if (!nombreCliente.trim()) return alert('Escribe el nombre del cliente')
    setCreandoLink(true)
    try {
      const res = await fetch('/api/firmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteNombre: nombreCliente, clienteTelefono: telefonoCliente || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setUltimoLink(data.data.link)
        setNombreCliente('')
        setTelefonoCliente('')
        load()
      } else {
        alert(data.error ?? 'No se pudo crear el enlace')
      }
    } finally {
      setCreandoLink(false)
    }
  }

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto)
    alert('Enlace copiado')
  }

  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Contrato activo */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Contrato (PDF)</h3>
        {contrato ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            <i className="ti ti-file-check" style={{ color: 'var(--green)', marginRight: 6 }} />
            Documento activo: <strong>{contrato.nombre}</strong>
          </p>
        ) : (
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            Aún no has subido ningún contrato.
          </p>
        )}
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
          <i className="ti ti-upload" /> {subiendo ? 'Subiendo...' : contrato ? 'Reemplazar PDF' : 'Subir PDF'}
          <input type="file" accept="application/pdf" onChange={subirPdf} disabled={subiendo} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Generar link de firma */}
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Generar enlace de firma</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nombre del cliente</label>
            <input
              className="form-input"
              value={nombreCliente}
              onChange={e => setNombreCliente(e.target.value)}
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Teléfono (opcional)</label>
            <input
              className="form-input"
              value={telefonoCliente}
              onChange={e => setTelefonoCliente(e.target.value)}
              placeholder="10 dígitos"
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={crearLink} disabled={creandoLink || !contrato}>
            <i className="ti ti-link" /> {creandoLink ? 'Generando...' : 'Generar enlace'}
          </button>
        </div>
        {!contrato && (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}>Sube un contrato primero para poder generar enlaces.</p>
        )}
        {ultimoLink && (
          <div style={{ marginTop: 14, background: '#f0f6ff', border: '1px solid #bcd6f7', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ fontSize: 12.5 }}>{ultimoLink}</code>
            <button className="btn btn-secondary btn-sm" onClick={() => copiar(ultimoLink)}>
              <i className="ti ti-copy" /> Copiar
            </button>
          </div>
        )}
      </div>

      {/* Lista de firmas */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, padding: '16px 20px 0' }}>Enlaces generados</h3>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: 20 }}>Cargando...</p>
        ) : firmas.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', padding: 20 }}>Aún no has generado ningún enlace.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Firmado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {firmas.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>{f.clienteNombre}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{f.clienteTelefono || '—'}</td>
                  <td>
                    <span className={`pill ${f.estado === 'firmado' ? 'pill-green' : 'pill-amber'}`}>
                      {f.estado === 'firmado' ? 'Firmado' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {f.firmadoEn ? new Date(f.firmadoEn).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => copiar(`${window.location.origin}/firmar/${f.token}`)}>
                      <i className="ti ti-copy" /> Copiar enlace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
