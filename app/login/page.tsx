'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ correo: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al iniciar sesión'); return }
      router.push('/dashboard')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--surface)',
    }}>
      <div style={{ width: 400, maxWidth: '95vw' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{
            width: 44, height: 44, background: 'var(--teal)', borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-tooth" style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <span style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)' }}>
            Smitt<span style={{ color: 'var(--teal)' }}>Dent</span>
          </span>
        </div>

        <div className="card" style={{ padding: '32px 28px' }}>
          <h1 style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            Iniciar sesión
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Bienvenida al sistema de gestión clínica
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Correo electrónico</label>
              <input
                className="form-input"
                type="email"
                required
                autoComplete="email"
                value={form.correo}
                onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
                placeholder="tu@correo.com"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{
                background: '#fdeae8', color: '#c0392b', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
            ¿Eres nueva doctora?{' '}
            <Link href="/register" style={{ color: 'var(--blue-accent)', fontWeight: 500 }}>
              Solicitar acceso
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
