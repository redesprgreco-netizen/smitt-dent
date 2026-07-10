'use client'

import { useState } from 'react'

const DORADO = '#F5A623'
const NEGRO = '#0d0d0d'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function iniciarSesion(e) {
    e.preventDefault()
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.href = '/scan'
      } else {
        const data = await res.json()
        setError(data.error || 'Error al iniciar sesión')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: NEGRO, color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 340, width: '100%', padding: 24 }}>
        <h1 style={{ fontSize: 20, color: DORADO, textAlign: 'center', marginBottom: 20 }}>Acceso de tienda</h1>
        <form onSubmit={iniciarSesion}>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #444', background: '#1a1a1a', color: 'white' }}
          />
          <button
            type="submit"
            disabled={cargando}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: DORADO, color: '#000', fontWeight: 700, cursor: 'pointer' }}
          >
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        {error && <p style={{ color: '#ff8a8a', marginTop: 12, textAlign: 'center' }}>{error}</p>}
      </div>
    </div>
  )
}
