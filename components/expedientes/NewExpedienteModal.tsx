'use client'
import { useState } from 'react'
import type { Usuario } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  doctoras: Pick<Usuario, 'id' | 'nombre' | 'apellido'>[]
  currentUserId: number
  currentUserRol: string
}

export default function NewExpedienteModal({ open, onClose, onSaved, doctoras, currentUserId, currentUserRol }: Props) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', fechaNacimiento: '', telefono: '', correo: '',
    alergias: '', motivoInicial: '',
    doctoraId: currentUserRol === 'admin' ? (doctoras[0]?.id ?? currentUserId) : currentUserId,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear expediente'); return }
      onSaved()
      onClose()
      setForm({ nombre: '', apellido: '', fechaNacimiento: '', telefono: '', correo: '', alergias: '', motivoInicial: '', doctoraId: form.doctoraId })
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          Nuevo expediente
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label">Nombre</label>
              <input className="form-input" required value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="María" />
            </div>
            <div>
              <label className="form-label">Apellido</label>
              <input className="form-input" required value={form.apellido}
                onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} placeholder="Rodríguez" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label">Fecha de nacimiento</label>
              <input className="form-input" type="date" value={form.fechaNacimiento}
                onChange={e => setForm(f => ({ ...f, fechaNacimiento: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={form.telefono}
                onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="777 123 4567" />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Correo (opcional)</label>
            <input className="form-input" type="email" value={form.correo}
              onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} placeholder="paciente@correo.com" />
          </div>

          {currentUserRol === 'admin' && (
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Doctora asignada</label>
              <select className="form-select" value={form.doctoraId}
                onChange={e => setForm(f => ({ ...f, doctoraId: parseInt(e.target.value) }))}>
                {doctoras.map(d => <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Alergias</label>
            <textarea className="form-textarea" value={form.alergias} style={{ minHeight: 50 }}
              onChange={e => setForm(f => ({ ...f, alergias: e.target.value }))} placeholder="Penicilina, látex, etc." />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Motivo de consulta inicial</label>
            <textarea className="form-textarea" value={form.motivoInicial}
              onChange={e => setForm(f => ({ ...f, motivoInicial: e.target.value }))} placeholder="Describe el motivo de la primera visita..." />
          </div>

          {error && (
            <div style={{ background: '#fdeae8', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear expediente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
