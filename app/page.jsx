'use client'

import { useState } from 'react'

const DORADO = '#F5A623'
const ROJO = '#C81D25'
const NEGRO = '#0d0d0d'

export default function HomePage() {
  const [modo, setModo] = useState('elegir') // 'elegir' | 'registro' | 'consultar'
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [telefonoConsulta, setTelefonoConsulta] = useState('')
  const [cliente, setCliente] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function registrarse(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al registrarse')
        return
      }
      setCliente(data)
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  async function consultarPorTelefono(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const res = await fetch(`/api/clientes/telefono/${encodeURIComponent(telefonoConsulta)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No encontramos tu registro')
        return
      }
      setCliente(data)
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  const contenedorEstilo = {
    minHeight: '100vh',
    background: NEGRO,
    color: 'white',
    fontFamily: 'system-ui, sans-serif',
  }

  const inputEstilo = {
    width: '100%', padding: 12, marginBottom: 12, borderRadius: 8,
    border: `1px solid #444`, background: '#1a1a1a', color: 'white',
  }

  const botonEstilo = {
    width: '100%', padding: 14, borderRadius: 8, border: 'none',
    background: DORADO, color: '#000', fontWeight: 700, cursor: 'pointer',
    letterSpacing: 1,
  }

  // Pantalla: tarjeta de estrellas (tras registrarse o consultar)
  if (cliente) {
    return (
      <div style={contenedorEstilo}>
        <div style={{ maxWidth: 420, margin: '0 auto', padding: 24, textAlign: 'center' }}>
          <img src="/logo-circular.png" alt="La Gallina Rebelde" style={{ width: 100, height: 100, borderRadius: '50%', marginTop: 20 }} />
          <h1 style={{ fontSize: 22, marginTop: 16, color: DORADO }}>¡Hola, {cliente.nombre || 'cliente'}!</h1>
          <p style={{ marginTop: 8, color: '#bbb' }}>Muestra este código en cada compra para sumar estrellas.</p>

          <div style={{
            marginTop: 24, padding: 20, background: 'white', borderRadius: 12,
            display: 'inline-block',
          }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(cliente.codigo)}`}
              alt="Tu código QR"
              width={220}
              height={220}
            />
          </div>

          <p style={{ marginTop: 14, fontSize: 28, letterSpacing: 4, fontWeight: 700, color: DORADO }}>
            {cliente.codigo}
          </p>

          <p style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
            Muestra el QR o dicta tu código en la tienda
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '20px 0' }}>
            {Array.from({ length: cliente.meta_estrellas }).map((_, i) => (
              <span key={i} style={{ fontSize: 28, color: i < cliente.estrellas ? DORADO : '#333' }}>★</span>
            ))}
          </div>

          <p style={{ color: '#ccc' }}>Compra {cliente.estrellas} de {cliente.meta_estrellas}</p>

          <p style={{ marginTop: 20, fontSize: 13, color: '#888' }}>
            ¿Perdiste esta pantalla? Vuelve a esta página y consulta con tu teléfono cuando quieras.
          </p>

          <button
            onClick={() => { setCliente(null); setModo('elegir'); setError(null) }}
            style={{
              marginTop: 16, padding: '10px 20px', borderRadius: 8, border: '1px solid #444',
              background: 'transparent', color: '#aaa', cursor: 'pointer',
            }}
          >
            Volver
          </button>

          <a
            href="/scan"
            style={{
              display: 'block', marginTop: 20, textAlign: 'center', padding: 12,
              borderRadius: 8, border: `1px solid #444`, color: '#888',
              fontSize: 13, textDecoration: 'none',
            }}
          >
            Acceso empleados →
          </a>
        </div>
      </div>
    )
  }

  // Pantalla: consultar con teléfono
  if (modo === 'consultar') {
    return (
      <div style={contenedorEstilo}>
        <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/logo-circular.png" alt="La Gallina Rebelde" style={{ width: 90, height: 90, borderRadius: '50%', marginTop: 20 }} />
          </div>

          <h1 style={{ fontSize: 20, marginBottom: 16, color: DORADO, textAlign: 'center' }}>
            VER MIS ESTRELLAS
          </h1>

          <form onSubmit={consultarPorTelefono}>
            <input
              type="tel"
              placeholder="Tu teléfono"
              value={telefonoConsulta}
              onChange={(e) => setTelefonoConsulta(e.target.value)}
              style={inputEstilo}
            />
            <button type="submit" disabled={cargando} style={botonEstilo}>
              {cargando ? 'Buscando...' : 'CONSULTAR'}
            </button>
          </form>

          {error && <p style={{ color: '#ff8a8a', marginTop: 12, textAlign: 'center' }}>{error}</p>}

          <button
            onClick={() => { setModo('elegir'); setError(null) }}
            style={{
              width: '100%', marginTop: 16, padding: 12, borderRadius: 8, border: '1px solid #444',
              background: 'transparent', color: '#aaa', cursor: 'pointer',
            }}
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  // Pantalla: registro nuevo
  if (modo === 'registro') {
    return (
      <div style={contenedorEstilo}>
        <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/logo-banner.png" alt="La Gallina Rebelde" style={{ width: '100%', borderRadius: 12, marginTop: 20 }} />
          </div>

          <h1 style={{ fontSize: 20, marginBottom: 16, color: DORADO, textAlign: 'center' }}>
            ÚNETE AL PROGRAMA DE ESTRELLAS
          </h1>

          <form onSubmit={registrarse}>
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={inputEstilo}
            />
            <input
              type="tel"
              placeholder="Tu teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              style={{ ...inputEstilo, marginBottom: 16 }}
            />
            <button type="submit" disabled={cargando} style={botonEstilo}>
              {cargando ? 'Registrando...' : 'REGISTRARME'}
            </button>
          </form>

          {error && <p style={{ color: '#ff8a8a', marginTop: 12, textAlign: 'center' }}>{error}</p>}

          <div style={{ marginTop: 32, padding: 16, background: '#1a1a1a', borderRadius: 8, fontSize: 13, color: '#999' }}>
            <p style={{ color: DORADO, fontWeight: 700, marginBottom: 6 }}>Cómo funciona:</p>
            <p>Compra 2 → 10% de descuento</p>
            <p>Compra 4 → 25% de descuento en tu compra total</p>
            <p>Compra 6 → ¡Papas gratis!</p>
          </div>

          <button
            onClick={() => { setModo('elegir'); setError(null) }}
            style={{
              width: '100%', marginTop: 16, padding: 12, borderRadius: 8, border: '1px solid #444',
              background: 'transparent', color: '#aaa', cursor: 'pointer',
            }}
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  // Pantalla inicial: elegir entre registrarse o consultar
  return (
    <div style={contenedorEstilo}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo-banner.png" alt="La Gallina Rebelde" style={{ width: '100%', borderRadius: 12, marginTop: 20 }} />
        </div>

        <h1 style={{ fontSize: 20, marginBottom: 24, color: DORADO, textAlign: 'center' }}>
          PROGRAMA DE ESTRELLAS
        </h1>

        <button onClick={() => setModo('registro')} style={{ ...botonEstilo, marginBottom: 12 }}>
          SOY NUEVO, REGISTRARME
        </button>

        <button
          onClick={() => setModo('consultar')}
          style={{
            width: '100%', padding: 14, borderRadius: 8, border: `2px solid ${DORADO}`,
            background: 'transparent', color: DORADO, fontWeight: 700, cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          YA SOY CLIENTE, VER MIS ESTRELLAS
        </button>

        <div style={{ marginTop: 32, padding: 16, background: '#1a1a1a', borderRadius: 8, fontSize: 13, color: '#999' }}>
          <p style={{ color: DORADO, fontWeight: 700, marginBottom: 6 }}>Cómo funciona:</p>
          <p>Compra 2 → 10% de descuento</p>
          <p>Compra 4 → 25% de descuento en tu compra total</p>
          <p>Compra 6 → ¡Papas gratis!</p>
        </div>

        <a
          href="/scan"
          style={{
            display: 'block', marginTop: 20, textAlign: 'center', padding: 12,
            borderRadius: 8, border: `1px solid #444`, color: '#888',
            fontSize: 13, textDecoration: 'none',
          }}
        >
          Acceso empleados →
        </a>
      </div>
    </div>
  )
}
