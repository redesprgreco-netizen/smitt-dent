'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nombre: '', apellido: '', correo: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, apellido: form.apellido, correo: form.correo, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al registrar'); return }
      setSuccess(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <div className="card" style={{ padding: '40px 32px', textAlign: 'center', maxWidth: 420, width: '95vw' }}>
          <div style={{ width: 56, height: 56, background: '#e8f8ee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="ti ti-check" style={{ fontSize: 28, color: '#1a9e5c' }} />
          </div>
          <h2 style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>¡Solicitud enviada!</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Tu cuenta está en estado <strong>pendiente</strong>. La administradora revisará tu solicitud y te dará acceso pronto.
          </p>
          <Link href="/login">
            <button className="btn btn-secondary" style={{ marginTop: 24 }}>Volver al inicio de sesión</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
      <div style={{ width: 440, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, background: 'var(--teal)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-tooth" style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <span style={{ fontFamily: 'Sora', fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)' }}>
            Smitt<span style={{ color: 'var(--teal)' }}>Dent</span>
          </span>
        </div>

        <div className="card" style={{ padding: '32px 28px' }}>
          <h1 style={{ fontFamily: 'Sora', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Solicitar acceso</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Tu cuenta quedará pendiente hasta que la administradora la apruebe.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label">Nombre</label>
                <input className="form-input" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ana" />
              </div>
              <div>
                <label className="form-label">Apellido</label>
                <input className="form-input" required value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} placeholder="García" />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Correo electrónico</label>
              <input className="form-input" type="email" required value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} placeholder="doctora@correo.com" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Confirmar contraseña</label>
              <input className="form-input" type="password" required value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="••••••••" />
            </div>

            {error && (
              <div style={{ background: '#fdeae8', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Enviando solicitud...' : 'Solicitar acceso'}
            </button>
          </form>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
            ¿Ya tienes acceso?{' '}
            <Link href="/login" style={{ color: 'var(--blue-accent)', fontWeight: 500 }}>Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
