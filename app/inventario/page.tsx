'use client'
import { useState, useEffect, useCallback } from 'react'
import type { InventarioArticulo } from '@/types'

type Modal = null | 'nuevo' | 'movimiento'

export default function InventarioPage() {
  const [articulos, setArticulos] = useState<InventarioArticulo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [seleccionado, setSeleccionado] = useState<InventarioArticulo | null>(null)
  const [session, setSession] = useState<{ rol: string } | null>(null)
  const [q, setQ] = useState('')

  // Formularios
  const [formNuevo, setFormNuevo] = useState({ nombre: '', categoria: '', unidadMedida: '', stockMinimo: '0' })
  const [formMov, setFormMov] = useState({ tipo: 'entrada' as 'entrada' | 'salida', cantidad: '', notas: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.ok) setSession({ rol: d.data.rol }) })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q)}&pageSize=200` : '?pageSize=200'
      const res = await fetch(`/api/inventario${qs}`)
      const data = await res.json()
      if (data.ok) setArticulos(data.data)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  const bajoMinimo = articulos.filter(a => Number(a.stockActual) < Number(a.stockMinimo))

  async function crearArticulo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formNuevo, stockMinimo: parseFloat(formNuevo.stockMinimo) }),
      })
      if (res.ok) {
        setModal(null)
        setFormNuevo({ nombre: '', categoria: '', unidadMedida: '', stockMinimo: '0' })
        load()
      }
    } finally { setSaving(false) }
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault()
    if (!seleccionado) return
    setSaving(true)
    try {
      const res = await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articuloId: seleccionado.id,
          tipo: formMov.tipo,
          cantidad: parseFloat(formMov.cantidad),
          notas: formMov.notas,
        }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }
      setModal(null)
      setFormMov({ tipo: 'entrada', cantidad: '', notas: '' })
      load()
    } finally { setSaving(false) }
  }

  function abrirMovimiento(art: InventarioArticulo) {
    setSeleccionado(art)
    setFormMov({ tipo: 'entrada', cantidad: '', notas: '' })
    setModal('movimiento')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700 }}>Inventario</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Control de insumos y materiales</p>
        </div>
        {session?.rol === 'admin' && (
          <button className="btn btn-primary" onClick={() => setModal('nuevo')}>
            <i className="ti ti-plus" /> Nuevo artículo
          </button>
        )}
      </div>

      {/* Alertas de stock bajo */}
      {bajoMinimo.length > 0 && (
        <div style={{ background: '#fdeae8', border: '1px solid #f5c6c2', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <i className="ti ti-alert-triangle" style={{ color: '#c0392b', fontSize: 18 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#c0392b' }}>
              {bajoMinimo.length} artículo{bajoMinimo.length > 1 ? 's' : ''} bajo el mínimo de stock
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {bajoMinimo.map(a => (
              <span key={a.id} style={{ fontSize: 12, background: '#fff', borderRadius: 6, padding: '3px 10px', color: '#c0392b' }}>
                {a.nombre} ({Number(a.stockActual)}/{Number(a.stockMinimo)} {a.unidadMedida})
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder="Buscar artículo..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cargando...</p>
      ) : articulos.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <i className="ti ti-package-off" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }} />
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>No hay artículos en el inventario</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articulos.map(art => {
                const bajo = Number(art.stockActual) < Number(art.stockMinimo)
                const pct = Number(art.stockMinimo) > 0 ? Math.min(100, Math.round((Number(art.stockActual) / Number(art.stockMinimo)) * 100)) : 100
                return (
                  <tr key={art.id}>
                    <td style={{ fontWeight: 500 }}>{art.nombre}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{art.categoria ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{art.unidadMedida}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 600, color: bajo ? '#c0392b' : 'var(--text-main)' }}>
                          {Number(art.stockActual)}
                        </span>
                        <div style={{ flex: 1, maxWidth: 80, height: 6, background: '#e8edf5', borderRadius: 3 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            background: bajo ? '#e74c3c' : pct > 50 ? '#1a9e5c' : '#c87d00',
                            width: `${Math.min(100, pct)}%`,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>{Number(art.stockMinimo)}</td>
                    <td>
                      <span className={`pill ${bajo ? 'pill-red' : 'pill-green'}`}>
                        {bajo ? 'Bajo mínimo' : 'OK'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => abrirMovimiento(art)}>
                        <i className="ti ti-arrows-exchange" /> Movimiento
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nuevo artículo */}
      {modal === 'nuevo' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Nuevo artículo
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={crearArticulo}>
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Nombre</label>
                <input className="form-input" required value={formNuevo.nombre}
                  onChange={e => setFormNuevo(f => ({ ...f, nombre: e.target.value }))} placeholder="Guantes de látex, Hilo dental..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label">Categoría</label>
                  <input className="form-input" value={formNuevo.categoria}
                    onChange={e => setFormNuevo(f => ({ ...f, categoria: e.target.value }))} placeholder="Consumibles, Instrumentos..." />
                </div>
                <div>
                  <label className="form-label">Unidad de medida</label>
                  <input className="form-input" required value={formNuevo.unidadMedida}
                    onChange={e => setFormNuevo(f => ({ ...f, unidadMedida: e.target.value }))} placeholder="piezas, cajas, ml..." />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Stock mínimo</label>
                <input className="form-input" type="number" min="0" value={formNuevo.stockMinimo}
                  onChange={e => setFormNuevo(f => ({ ...f, stockMinimo: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creando...' : 'Crear artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar movimiento */}
      {modal === 'movimiento' && seleccionado && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Movimiento — {seleccionado.nombre}
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              Stock actual: <strong>{Number(seleccionado.stockActual)} {seleccionado.unidadMedida}</strong>
            </div>
            <form onSubmit={registrarMovimiento}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="form-label">Tipo</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['entrada', 'salida'].map(t => (
                      <button
                        key={t} type="button"
                        onClick={() => setFormMov(f => ({ ...f, tipo: t as 'entrada' | 'salida' }))}
                        className="btn btn-sm"
                        style={{
                          flex: 1,
                          background: formMov.tipo === t ? (t === 'entrada' ? '#e8f8ee' : '#fdeae8') : '#fff',
                          border: `1px solid ${formMov.tipo === t ? (t === 'entrada' ? '#1a9e5c' : '#c0392b') : 'var(--border)'}`,
                          color: formMov.tipo === t ? (t === 'entrada' ? '#1a9e5c' : '#c0392b') : 'var(--text-main)',
                        }}
                      >
                        <i className={`ti ${t === 'entrada' ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'}`} />
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">Cantidad ({seleccionado.unidadMedida})</label>
                  <input className="form-input" type="number" min="0.01" step="0.01" required value={formMov.cantidad}
                    onChange={e => setFormMov(f => ({ ...f, cantidad: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Notas (opcional)</label>
                <input className="form-input" value={formMov.notas}
                  onChange={e => setFormMov(f => ({ ...f, notas: e.target.value }))} placeholder="Compra a proveedor, uso en cirugía..." />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
