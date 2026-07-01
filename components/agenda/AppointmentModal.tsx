'use client'
import { useState, useEffect } from 'react'
import type { Cita, Usuario } from '@/types'

interface AppointmentModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  defaultDate: string
  doctoras: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'colorAgenda'>[]
  currentUserId: number
  currentUserRol: string
  editingCita?: Cita | null
}

export default function AppointmentModal({
  open, onClose, onSaved, defaultDate, doctoras, currentUserId, currentUserRol, editingCita,
}: AppointmentModalProps) {
  const [form, setForm] = useState({
    nombrePaciente: '', apellidoPaciente: '', asunto: '',
    fecha: defaultDate, hora: '09:00', notas: '',
    doctoraId: currentUserRol === 'admin' ? (doctoras[0]?.id ?? currentUserId) : currentUserId,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingCita) {
      setForm({
        nombrePaciente: editingCita.nombrePaciente,
        apellidoPaciente: editingCita.apellidoPaciente,
        asunto: editingCita.asunto,
        fecha: editingCita.fecha.slice(0, 10),
        hora: editingCita.hora || '09:00',
        notas: editingCita.notas ?? '',
        doctoraId: editingCita.doctoraId,
      })
    } else {
      setForm(f => ({ ...f, fecha: defaultDate }))
    }
  }, [editingCita, defaultDate, open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const url = editingCita ? `/api/citas/${editingCita.id}` : '/api/citas'
      const method = editingCita ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar la cita'); return }
      onSaved()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!editingCita) return
    if (!confirm('¿Cancelar esta cita?')) return
    setLoading(true)
    try {
      await fetch(`/api/citas/${editingCita.id}`, { method: 'DELETE' })
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {editingCita ? 'Editar cita' : 'Anotar cita'}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label">Nombre paciente</label>
              <input className="form-input" required value={form.nombrePaciente}
                onChange={e => setForm(f => ({ ...f, nombrePaciente: e.target.value }))} placeholder="María" />
            </div>
            <div>
              <label className="form-label">Apellido paciente</label>
              <input className="form-input" required value={form.apellidoPaciente}
                onChange={e => setForm(f => ({ ...f, apellidoPaciente: e.target.value }))} placeholder="Rodríguez" />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Asunto</label>
            <input className="form-input" required value={form.asunto}
              onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))} placeholder="Limpieza, Ortodoncia, Revisión..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label">Fecha</label>
              <input className="form-input" type="date" required value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Hora</label>
              <input className="form-input" type="time" required value={form.hora}
                onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
            </div>
          </div>

          {currentUserRol === 'admin' && (
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Doctora</label>
              <select className="form-select" value={form.doctoraId}
                onChange={e => setForm(f => ({ ...f, doctoraId: parseInt(e.target.value) }))}>
                {doctoras.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Notas (opcional)</label>
            <textarea className="form-textarea" value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Notas adicionales sobre la cita..." />
          </div>

          {error && (
            <div style={{ background: '#fdeae8', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            {editingCita && (
              <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={loading} style={{ marginRight: 'auto' }}>
                <i className="ti ti-calendar-cancel" /> Cancelar cita
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : editingCita ? 'Guardar cambios' : 'Anotar cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
