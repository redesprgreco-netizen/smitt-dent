'use client'

import { useEffect, useState } from 'react'
import TarjetaCliente from '../../components/TarjetaCliente'

const DORADO = '#F5A623'
const NEGRO = '#0d0d0d'

export default function MiTarjetaPage() {
  const [codigo, setCodigo] = useState('')
  const [cliente, setCliente] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  // Si el navegador ya tiene un código guardado (de una visita anterior), lo usamos directo.
  useEffect(() => {
    const guardado = window.localStorage.getItem('gr_codigo')
    if (guardado) {
      buscar(guardado)
    }
  }, [])

  async function buscar(valor) {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/clientes/${valor.trim().toUpperCase()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No encontramos ese código')
        window.localStorage.removeItem('gr_codigo')
        return
      }
      setCliente(data)
      window.localStorage.setItem('gr_codigo', data.codigo)
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  function buscarSubmit(e) {
    e.preventDefault()
    if (!codigo.trim()) return
    buscar(codigo)
  }

  function salir() {
    window.localStorage.removeItem('gr_codigo')
    setCliente(null)
    setCodigo('')
  }

  return (
    <div style={{ minHeight: '100vh', background: NEGRO, color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {cliente ? (
        <TarjetaCliente cliente={cliente} onSalir={salir} />
      ) : (
        <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src="/logo-circular.png" alt="La Gallina Rebelde" style={{ width: 90, height: 90, borderRadius: '50%', marginTop: 20 }} />
            <h1 style={{ fontSize: 20, marginTop: 12, color: DORADO }}>Consulta tus estrellas</h1>
            <p style={{ color: '#999', fontSize: 13, marginTop: 6 }}>Escribe el código que te dimos al registrarte</p>
          </div>

          <form onSubmit={buscarSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Ej: A3F9K2"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              style={{
                flex: 1, padding: 12, borderRadius: 8, border: '1px solid #444',
                background: '#1a1a1a', color: 'white', letterSpacing: 2, textTransform: 'uppercase',
              }}
            />
            <button
              type="submit"
              style={{ padding: '0 18px', borderRadius: 8, border: 'none', background: DORADO, color: '#000', fontWeight: 700, cursor: 'pointer' }}
            >
              Ver
            </button>
          </form>

          {cargando && <p style={{ marginTop: 16, textAlign: 'center', color: DORADO }}>Buscando...</p>}
          {error && (
            <div style={{ marginTop: 16, padding: 12, background: '#3a1010', color: '#ff8a8a', borderRadius: 8, border: '1px solid #C81D25' }}>
              {error}
            </div>
          )}

          <a
            href="/"
            style={{ display: 'block', marginTop: 20, textAlign: 'center', color: '#888', fontSize: 13, textDecoration: 'none' }}
          >
            ← Aún no me registro
          </a>
        </div>
      )}
    </div>
  )
}
