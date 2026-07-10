'use client'

import { useEffect, useState } from 'react'

const DORADO = '#F5A623'
const NEGRO = '#0d0d0d'

export default function AdminPage() {
  const [clientes, setClientes] = useState([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [bannerTexto, setBannerTexto] = useState('')
  const [bannerActivo, setBannerActivo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    cargarClientes()
    cargarBanner()
  }, [])

  async function cargarClientes() {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/clientes')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No se pudo cargar la lista de clientes')
        return
      }
      setClientes(data.clientes)
      setTotal(data.total)
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  async function cargarBanner() {
    try {
      const res = await fetch('/api/config')
      const data = await res.json()
      setBannerTexto(data.banner_texto || '')
      setBannerActivo(Boolean(data.banner_activo))
    } catch (err) {
      // silencioso: no es crítico si falla
    }
  }

  async function guardarBanner(e) {
    e.preventDefault()
    setGuardando(true)
    setGuardado(false)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banner_texto: bannerTexto, banner_activo: bannerActivo }),
      })
      if (res.ok) {
        setGuardado(true)
        setTimeout(() => setGuardado(false), 2000)
      }
    } catch (err) {
      // silencioso
    } finally {
      setGuardando(false)
    }
  }

  function exportarCSV() {
    const filas = [
      ['Nombre', 'Teléfono', 'Código', 'Estrellas', 'Meta', 'Registrado'],
      ...clientes.map((c) => [
        c.nombre || '',
        c.telefono || '',
        c.codigo || '',
        c.estrellas,
        c.meta_estrellas,
        new Date(c.created_at).toLocaleDateString('es-MX'),
      ]),
    ]
    const csv = filas.map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes-gallina-rebelde.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight: '100vh', background: NEGRO, color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, color: DORADO }}>Panel del dueño</h1>
          <a href="/scan" style={{ color: '#888', fontSize: 13, textDecoration: 'none' }}>Ir a escanear →</a>
        </div>

        {/* Banner de avisos */}
        <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 18, marginBottom: 24, border: '1px solid #333' }}>
          <h2 style={{ fontSize: 15, color: DORADO, marginBottom: 12 }}>Banner de avisos / ofertas</h2>
          <form onSubmit={guardarBanner}>
            <textarea
              value={bannerTexto}
              onChange={(e) => setBannerTexto(e.target.value)}
              placeholder="Ej: ¡Hoy 2x1 en papas de 5 a 7pm!"
              rows={3}
              style={{
                width: '100%', padding: 12, borderRadius: 8, border: '1px solid #444',
                background: '#0d0d0d', color: 'white', fontFamily: 'inherit', resize: 'vertical',
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, color: '#ccc' }}>
              <input
                type="checkbox"
                checked={bannerActivo}
                onChange={(e) => setBannerActivo(e.target.checked)}
              />
              Mostrar este banner a los clientes
            </label>
            <button
              type="submit"
              disabled={guardando}
              style={{
                marginTop: 14, padding: '10px 18px', borderRadius: 8, border: 'none',
                background: DORADO, color: '#000', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar banner'}
            </button>
            {guardado && <span style={{ marginLeft: 12, color: '#7fd97f', fontSize: 13 }}>Guardado ✓</span>}
          </form>
        </div>

        {/* Lista de clientes */}
        <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 18, border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, color: DORADO }}>
              Clientes registrados {!cargando && `(${total})`}
            </h2>
            {clientes.length > 0 && (
              <button
                onClick={exportarCSV}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid #444',
                  background: 'transparent', color: '#ccc', fontSize: 12, cursor: 'pointer',
                }}
              >
                Exportar CSV
              </button>
            )}
          </div>

          {cargando && <p style={{ color: '#888' }}>Cargando...</p>}
          {error && <p style={{ color: '#ff8a8a' }}>{error}</p>}

          {!cargando && !error && clientes.length === 0 && (
            <p style={{ color: '#888' }}>Todavía no tienes clientes registrados.</p>
          )}

          {!cargando && clientes.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '8px 6px' }}>Nombre</th>
                    <th style={{ padding: '8px 6px' }}>Teléfono</th>
                    <th style={{ padding: '8px 6px' }}>Código</th>
                    <th style={{ padding: '8px 6px' }}>Estrellas</th>
                    <th style={{ padding: '8px 6px' }}>Registrado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '8px 6px' }}>{c.nombre || '—'}</td>
                      <td style={{ padding: '8px 6px' }}>{c.telefono || '—'}</td>
                      <td style={{ padding: '8px 6px', color: DORADO, letterSpacing: 1 }}>{c.codigo}</td>
                      <td style={{ padding: '8px 6px' }}>{c.estrellas} / {c.meta_estrellas}</td>
                      <td style={{ padding: '8px 6px', color: '#999' }}>
                        {new Date(c.created_at).toLocaleDateString('es-MX')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
